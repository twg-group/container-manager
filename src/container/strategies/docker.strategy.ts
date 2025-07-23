import Docker from 'dockerode';
import { Injectable } from '@nestjs/common';
import {
  DeployConfigDto,
  InfoDto,
  LogDto,
  PortBindingDto,
  VolumeBindingDto,
} from '@dto';
import { BaseStrategy } from './base.strategy';

@Injectable()
export class DockerStrategy extends BaseStrategy {
  private readonly docker: Docker;

  constructor() {
    super();
    this.docker = new Docker({
      socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock',
    });
  }

  async start(id: string): Promise<void> {
    try {
      const container = this.docker.getContainer(id);
      await container.start();
    } catch (error) {
      this.handleError(error, `Failed to start container ${id}`);
    }
  }

  async stop(id: string, timeout = 10): Promise<void> {
    try {
      const container = this.docker.getContainer(id);
      await container.stop({ t: timeout });
    } catch (error) {
      this.handleError(error, `Failed to stop container ${id}`);
    }
  }

  async deploy(config: DeployConfigDto): Promise<string> {
    this.validateConfig(config);
    const containerName = config.name || this.generateName();
    const portBindings = this.createPortBindings(config.ports);
    const volumeBinds = this.createVolumeBinds(config.volumes);
    try {
      const container = await this.docker.createContainer({
        Image: config.image,
        name: containerName,
        Env: this.formatEnvironment(config.env),
        HostConfig: {
          PortBindings: portBindings,
          Binds: volumeBinds,
          RestartPolicy: {
            Name: config.restartPolicy ? 'always' : 'no',
          },
        },
        Labels: config.labels,
      });

      await container.start();
      return container.id;
    } catch (error) {
      this.handleError(error, 'Docker deployment failed');
    }
  }

  async list(): Promise<InfoDto[]> {
    try {
      const containers = await this.docker.listContainers({ all: true });
      return containers.map((container) => this.formatContainerInfo(container));
    } catch (error) {
      this.handleError(error, 'Failed to list containers');
    }
  }

  async remove(containerId: string): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.stop().catch(() => {
        /* Ignore if already stopped */
      });
      await container.remove();
    } catch (error) {
      this.handleError(error, `Failed to remove container ${containerId}`);
    }
  }

  async logs(
    containerId: string,
    since?: string,
    tail?: number,
  ): Promise<LogDto[]> {
    try {
      const container = this.docker.getContainer(containerId);
      const logs = await container.logs({
        since,
        tail,
        stdout: true,
        stderr: true,
        timestamps: true,
      });

      return this.parseLogs(logs.toString());
    } catch (error) {
      this.handleError(error, `Failed to get logs for ${containerId}`);
    }
  }

  private createPortBindings(
    ports?: PortBindingDto[],
  ): Record<string, Docker.PortBinding[]> {
    if (!ports) return {};

    return ports.reduce(
      (acc, port) => {
        const key = `${port.containerPort}/${port.protocol || 'tcp'}`;
        acc[key] = [{ HostPort: port.hostPort.toString() }];
        return acc;
      },
      {} as Record<string, Docker.PortBinding[]>,
    );
  }

  private createVolumeBinds(
    volumes?: VolumeBindingDto[],
  ): string[] | undefined {
    return volumes?.map(
      (v) => `${v.hostPath}:${v.containerPath}:${v.mode || 'rw'}`,
    );
  }

  private formatEnvironment(env?: Record<string, string>): string[] {
    return env ? Object.entries(env).map(([k, v]) => `${k}=${v}`) : [];
  }

  private formatContainerInfo(container: Docker.ContainerInfo): InfoDto {
    const ports = (container.Ports || []).map((p) =>
      `${p.PublicPort || ''}:${p.PrivatePort || ''}`.replace(/^:/, ''),
    );
    return {
      id: container.Id,
      name: container.Names[0].replace(/^\//, ''),
      image: container.Image,
      status: container.State,
      ports: [...new Set(ports)].sort(
        (a, b) => a.length - b.length || a.localeCompare(b),
      ),
      createdAt: new Date(container.Created * 1000).toISOString(),
    };
  }

  private parseLogs(logs: string): LogDto[] {
    const result: LogDto[] = [];
    const lines = logs.split('\n').filter((line) => line.trim().length > 0);
    for (const line of lines) {
      try {
        const dockerMatch = line.match(
          /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)\s(stdout|stderr)\s(.+)/,
        );
        if (dockerMatch) {
          result.push({
            timestamp: dockerMatch[1].replace('T', ' ').replace('Z', ''),
            stream: dockerMatch[2] as 'stdout' | 'stderr',
            message: dockerMatch[3].trim(),
          });
          continue;
        }
        if (line.charCodeAt(0) <= 31) {
          const timestampMatch = line.match(
            /(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[.,]\d+Z?)/,
          );
          if (timestampMatch) {
            const timestamp = timestampMatch[1]
              .replace('T', ' ')
              .replace(/[,Z]/g, '');
            const messageStart =
              timestampMatch.index! + timestampMatch[0].length;
            const message = line
              .slice(messageStart)
              .replace(/[\x00-\x1F]/g, '')
              .trim();

            if (message) {
              result.push({
                timestamp,
                stream: line.includes('stderr') ? 'stderr' : 'stdout',
                message,
              });
            }
          }
          continue;
        }
        const cleanLine = line
          .replace(/[\x00-\x1F]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        const fallbackTimestamp = new Date()
          .toISOString()
          .replace('T', ' ')
          .replace('Z', '');

        result.push({
          timestamp: fallbackTimestamp,
          stream: cleanLine.toLowerCase().includes('error')
            ? 'stderr'
            : 'stdout',
          message: cleanLine,
        });
      } catch (e) {
        console.error('Failed to parse log line:', line, e);
      }
    }
    return result.filter(
      (log) => log.message.length > 0 && log.message !== 'Z',
    );
  }
}
