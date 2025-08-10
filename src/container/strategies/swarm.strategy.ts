import Docker, { Task } from 'dockerode';
import { Injectable } from '@nestjs/common';
import {
  DeployConfigDto,
  InfoDto,
  LogDto,
  PortBindingDto,
  VolumeBindingDto,
} from '@dto';
import { BaseStrategy } from './base.strategy';
import { plainToInstance } from 'class-transformer';
import { Logger } from '@twg-group/nestjs-logger';

export interface SwarmTaskExtended extends Task {
  Status?: {
    State?: 'running' | 'failed' | 'complete' | 'shutdown';
    Error?: string;
    Timestamp?: string;
    ContainerStatus?: {
      ContainerID: string;
    };
  };
}

@Injectable()
export class SwarmStrategy extends BaseStrategy {
  private readonly docker: Docker;

  constructor(protected logger: Logger) {
    super(logger);
    this.docker = new Docker({
      socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock',
    });
  }

  async start(id: string): Promise<void> {
    try {
      const service = this.docker.getService(id);
      const serviceInfo = (await service.inspect()) as Docker.Service;
      const originalRestartPolicy =
        serviceInfo.Spec?.TaskTemplate?.RestartPolicy;
      await service.update({
        version: serviceInfo?.Version?.Index,
        Mode: {
          Replicated: {
            Replicas:
              serviceInfo.Spec?.Mode?.Replicated?.Replicas === 0
                ? 1
                : (serviceInfo.Spec?.Mode?.Replicated?.Replicas ?? 1),
          },
        },
        TaskTemplate: {
          ForceUpdate: 1,
          RestartPolicy: originalRestartPolicy
            ? { ...originalRestartPolicy }
            : { Condition: 'any' },
        },
      });
    } catch (error) {
      this.handleError(error, `Failed to start service ${id}`);
    }
  }

  async stop(id: string, timeout = 10): Promise<void> {
    try {
      const service = this.docker.getService(id);
      const serviceInfo = (await service.inspect()) as Docker.Service;
      await service.update({
        version: serviceInfo?.Version?.Index,
        Mode: {
          Replicated: {
            Replicas: 0,
          },
        },
        TaskTemplate: {
          ForceUpdate: 1,
          RestartPolicy: {
            Condition:
              serviceInfo.Spec?.TaskTemplate?.RestartPolicy?.Condition ??
              'none',
          },
        },
      });
      await new Promise((resolve) => setTimeout(resolve, timeout * 1000));
    } catch (error) {
      this.handleError(error, `Failed to stop service ${id}`);
    }
  }

  private createPortConfigs(ports?: PortBindingDto[]): Docker.PortConfig[] {
    if (!ports?.length) {
      return [];
    }
    return ports
      .filter((port) => port.containerPort)
      .map((port) => ({
        Protocol: (port.protocol?.toLowerCase() as 'tcp' | 'udp') || 'tcp',
        TargetPort: Number(port.containerPort),
        PublishedPort: port.hostPort ? Number(port.hostPort) : undefined,
        PublishMode: 'ingress' as const,
      }))
      .filter((config) => !isNaN(config.TargetPort));
  }

  private createMounts(volumes?: VolumeBindingDto[]): Docker.MountConfig {
    if (!volumes || volumes.length === 0) return [];
    return volumes.map((volume) => ({
      Type: 'bind',
      Source: volume.hostPath,
      Target: volume.containerPath,
      ReadOnly: volume.mode === 'ro',
    }));
  }

  private formatEnvironment(env?: Record<string, string>): string[] {
    return env ? Object.entries(env).map(([k, v]) => `${k}=${v}`) : [];
  }

  async deploy(config: DeployConfigDto): Promise<string> {
    this.validateConfig(config);
    const serviceName = config.name || this.generateName('service');
    const portConfigs = this.createPortConfigs(config.ports);
    const mounts = this.createMounts(config.volumes);
    try {
      const serviceSpec: Docker.CreateServiceOptions = {
        Name: serviceName,
        TaskTemplate: {
          ContainerSpec: {
            Image: config.image,
            Env: this.formatEnvironment(config.env),
            Mounts: mounts,
          },
          RestartPolicy: {
            Condition: config.restartPolicy ? 'any' : 'none',
          },
          Networks: config.network ? [{ Target: config.network }] : [],
        },
        Mode: {
          Replicated: {
            Replicas: config.replicas || 1,
          },
        },
        EndpointSpec:
          portConfigs.length > 0
            ? {
                Ports: portConfigs,
              }
            : undefined,
        Labels: config.labels || {},
      };
      const service = await this.docker.createService(serviceSpec);
      return service.id;
    } catch (error) {
      this.handleError(error, 'Swarm deployment failed');
    }
  }

  private async formatServiceInfo(service: Docker.Service): Promise<InfoDto> {
    try {
      const details = (await this.docker
        .getService(service.ID)
        .inspect()) as Docker.Service & {
        Spec?: {
          TaskTemplate?: {
            ContainerSpec?: {
              Env?: string[];
              Image?: string;
            };
          };
          Mode?: {
            Replicated?: {
              Replicas?: number;
            };
          };
          Name?: string;
          Labels?: Record<string, string>;
        };
        Endpoint?: {
          Ports?: Array<{
            PublishedPort?: number;
            TargetPort?: number;
            Protocol?: string;
          }>;
        };
      };

      const ports = (details.Endpoint?.Ports || [])
        .map((p) => {
          const protocol = p.Protocol || 'tcp';
          return p.PublishedPort
            ? `${p.PublishedPort}:${p.TargetPort}/${protocol}`
            : `${p.TargetPort}/${protocol}`;
        })
        .filter((p): p is string => !!p)
        .reduce<string[]>((acc, p) => (acc.includes(p) ? acc : [...acc, p]), [])
        .sort((a, b) => a.length - b.length || a.localeCompare(b));

      const taskTemplate = details.Spec?.TaskTemplate?.ContainerSpec;
      const env = (taskTemplate?.Env || []).reduce(
        (acc: Record<string, string>, line) => {
          const [key, ...val] = line.split('=');
          if (key) acc[key] = val.join('=');
          return acc;
        },
        {},
      );

      const desiredReplicas = details.Spec?.Mode?.Replicated?.Replicas ?? 0;
      const runningTasks = await this.docker
        .listTasks({
          filters: JSON.stringify({
            service: [service.ID],
            'desired-state': ['running'],
          }),
        })
        .then(
          (tasks) => tasks.length,
          () => 0,
        );
      const status =
        desiredReplicas === 0
          ? 'stopped'
          : runningTasks === desiredReplicas
            ? 'running'
            : runningTasks > 0
              ? 'partial'
              : 'pending';

      return plainToInstance(
        InfoDto,
        {
          id: service.ID,
          name: details.Spec?.Name,
          image: taskTemplate?.Image,
          status,
          ports,
          createdAt: service.CreatedAt
            ? new Date(service.CreatedAt).toISOString()
            : new Date().toISOString(),
          env,
        },
        { enableImplicitConversion: true },
      );
    } catch (error) {
      return this.handleError(
        error,
        `Failed to format service info for ${service.ID}`,
      );
    }
  }

  async list(): Promise<InfoDto[]> {
    try {
      const services = await this.docker.listServices();
      return await Promise.all(
        services.map((service) => this.formatServiceInfo(service)),
      );
    } catch (error) {
      this.handleError(error, 'Failed to list services');
    }
  }

  async remove(serviceId: string): Promise<void> {
    try {
      const service = this.docker.getService(serviceId);
      await service.remove();
    } catch (error) {
      this.handleError(error, `Failed to remove service ${serviceId}`);
    }
  }

  async logs(id: string, since?: string, tail?: number): Promise<LogDto[]> {
    try {
      const tasks = (await this.docker.listTasks({
        filters: JSON.stringify({ service: [id] }),
      })) as SwarmTaskExtended[];
      const allLogs: LogDto[] = [];
      for (const task of tasks) {
        const containerId = task.Status?.ContainerStatus?.ContainerID;
        if (containerId) {
          try {
            const logBuffer = await this.docker.getContainer(containerId).logs({
              since: since,
              tail: tail,
              stdout: true,
              stderr: true,
              timestamps: true,
            });
            const logsString = logBuffer.toString('utf8');
            const parsedLogs: LogDto[] = logsString
              .split('\n')
              .filter((line) => line.trim().length > 0)
              .map((line) => {
                const dockerMatch = line.match(
                  /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)\s+(stdout|stderr)\s+(.+)$/,
                );
                if (dockerMatch) {
                  return {
                    timestamp: dockerMatch[1]
                      .replace('T', ' ')
                      .replace('Z', ''),
                    stream: dockerMatch[2],
                    message: dockerMatch[3].trim(),
                  };
                }
                return {
                  timestamp: new Date()
                    .toISOString()
                    .replace('T', ' ')
                    .replace('Z', ''),
                  stream: line.toLowerCase().includes('error')
                    ? 'stderr'
                    : 'stdout',
                  message: line
                    .replace(/[\x00-\x1F]/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim(),
                };
              })
              .filter(
                (logDto) =>
                  logDto.message &&
                  logDto.message.length > 0 &&
                  logDto.message !== 'Z',
              );
            allLogs.push(...parsedLogs);
          } catch (logError) {
            this.logger.warn(
              `Could not fetch logs for container ${containerId} of task ${task.id}:`,
              logError,
            );
          }
        }
      }
      return allLogs.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    } catch (error) {
      return this.handleError(error, `Failed to get logs for service ${id}`);
    }
  }
}
