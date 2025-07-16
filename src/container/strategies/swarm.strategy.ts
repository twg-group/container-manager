import Docker, { Task } from 'dockerode';
import { Injectable, Logger } from '@nestjs/common';
import { DeployConfigDto, InfoDto, LogDto } from '@dto';
import { BaseStrategy } from './base.strategy';

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
  private readonly logger = new Logger(this.constructor.name);
  private readonly docker: Docker;

  constructor() {
    super();
    this.docker = new Docker({
      socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock',
    });
  }

  async start(id: string): Promise<void> {
    try {
      const service = this.docker.getService(id);
      await service.update({
        TaskTemplate: {
          ForceUpdate: 1,
          RestartPolicy: {
            Condition: 'any',
          },
        },
      });
    } catch (error) {
      this.handleError(error, `Failed to start service ${id}`);
    }
  }

  async stop(id: string, timeout = 10): Promise<void> {
    try {
      const service = this.docker.getService(id);
      await service.update({
        TaskTemplate: {
          ForceUpdate: 1,
          RestartPolicy: {
            Condition: 'none',
          },
        },
      });
      await new Promise((resolve) => setTimeout(resolve, timeout * 1000));
    } catch (error) {
      this.handleError(error, `Failed to stop service ${id}`);
    }
  }

  async deploy(config: DeployConfigDto): Promise<string> {
    this.validateConfig(config);
    try {
      const service = await this.docker.createService({
        Name: config.name || this.generateName('svc'),
        TaskTemplate: {
          ContainerSpec: {
            Image: config.image,
            Env: config.env
              ? Object.entries(config.env).map(([k, v]) => `${k}=${v}`)
              : [],
            Mounts: config.volumes?.map((v) => ({
              Type: 'bind',
              Source: v.hostPath,
              Target: v.containerPath,
              ReadOnly: v.mode === 'ro',
            })),
            Labels: config.labels,
          },
          Networks: config.network ? [{ Target: config.network }] : [],
        },
        Mode: {
          Replicated: { Replicas: config.replicas || 1 },
        },
        EndpointSpec: config.ports?.length
          ? {
              Ports: config.ports.map((p) => ({
                Protocol: (p.protocol || 'tcp').toLowerCase() as 'tcp' | 'udp',
                PublishedPort: p.hostPort,
                TargetPort: p.containerPort,
                PublishMode: 'ingress',
              })),
            }
          : undefined,
      });

      return service.ID;
    } catch (error) {
      return this.handleError(error, 'Swarm service deployment failed');
    }
  }

  async list(): Promise<InfoDto[]> {
    try {
      const services = await this.docker.listServices();
      return Promise.all(services.map((svc) => this.formatServiceInfo(svc)));
    } catch (error) {
      throw this.handleError(error, 'Failed to list swarm services');
    }
  }

  async remove(serviceId: string): Promise<void> {
    try {
      const service = this.docker.getService(serviceId);
      await service.remove();
    } catch (error) {
      throw this.handleError(error, `Failed to remove service ${serviceId}`);
    }
  }

  async logs(
    serviceId: string,
    since?: string,
    tail?: number,
  ): Promise<LogDto[]> {
    try {
      const tasks = await this.getServiceTasks(serviceId);
      return this.collectTasksLogs(tasks, since, tail);
    } catch (error) {
      throw this.handleError(
        error,
        `Failed to get logs for service ${serviceId}`,
      );
    }
  }

  private async getServiceTasks(
    serviceId: string,
  ): Promise<SwarmTaskExtended[]> {
    try {
      return await this.docker.listTasks({
        filters: JSON.stringify({
          service: [serviceId],
          'desired-state': ['running', 'accepted'],
        }),
      });
    } catch (error) {
      throw this.handleError(
        error,
        `Failed to get tasks for service ${serviceId}`,
      );
    }
  }

  private async collectTasksLogs(
    tasks: SwarmTaskExtended[],
    since?: string,
    tail?: number,
  ): Promise<LogDto[]> {
    const logPromises = tasks
      .filter(
        (task) =>
          task.Status?.State === 'running' &&
          task.Status.ContainerStatus?.ContainerID,
      )
      .map(async (task) => {
        const containerId = task?.Status?.ContainerStatus!.ContainerID;
        if (!containerId) {
          return [];
        }
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
          this.logger.error(
            `Failed to get logs for container ${containerId}`,
            error,
          );
          return [];
        }
      });
    return (await Promise.all(logPromises)).flat();
  }

  private async formatServiceInfo(service: Docker.Service): Promise<InfoDto> {
    const spec = service.Spec;
    const tasks = await this.getServiceTasks(service.ID);
    const containerSpec =
      spec?.TaskTemplate && 'ContainerSpec' in spec.TaskTemplate
        ? spec.TaskTemplate.ContainerSpec
        : undefined;
    const endpointSpec = spec?.EndpointSpec;
    return {
      id: service.ID,
      name: spec?.Name || 'unnamed',
      image: containerSpec?.Image || 'unknown',
      status: this.getServiceStatus(tasks),
      ports:
        endpointSpec?.Ports?.map((p) =>
          [p.PublishedPort, p.TargetPort].filter(Number.isInteger).join(':'),
        ) || [],
      createdAt: service.CreatedAt
        ? new Date(service.CreatedAt).toISOString()
        : new Date().toISOString(),
    };
  }

  private getServiceStatus(tasks: SwarmTaskExtended[]): string {
    const running = tasks.filter((t) => t.Status?.State === 'running').length;
    return `${running}/${tasks.length}`;
  }

  private parseLogs(logs: string): LogDto[] {
    return logs
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => {
        const timestampEnd = line.indexOf(' ');
        const streamStart = line.indexOf(' ', timestampEnd + 1);
        return {
          timestamp: line
            .substring(0, timestampEnd)
            .replace('T', ' ')
            .replace('Z', ''),
          stream: line
            .substring(timestampEnd + 1, streamStart)
            .replace(':', ''),
          message: line.substring(streamStart + 1),
        };
      });
  }
}
