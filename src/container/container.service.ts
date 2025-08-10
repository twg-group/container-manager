import { Injectable, Inject } from '@nestjs/common';
import { BaseStrategy } from '@strategies';
import { DeployConfigDto, InfoDto, LogDto, ListFilterDto } from '@dto';
import { Logger } from '@twg-group/nestjs-logger';
import { CONTAINER_STRATEGY } from './constants';

@Injectable()
export class ContainerService {
  private readonly logger = new Logger();

  constructor(
    @Inject(CONTAINER_STRATEGY)
    private readonly strategy: BaseStrategy,
  ) {}

  async start(id: string): Promise<void> {
    try {
      await this.strategy.start(id);
    } catch (error) {
      this.logError(error, `Failed to start container ${id}`);
      throw error;
    }
  }

  async stop(id: string, timeout?: number): Promise<void> {
    try {
      await this.strategy.stop(id, timeout);
    } catch (error) {
      this.logError(error, `Failed to stop container ${id}`);
      throw error;
    }
  }

  async deploy(config: DeployConfigDto): Promise<string> {
    try {
      return await this.strategy.deploy(config);
    } catch (error) {
      this.logError(error, 'Deployment failed');
      throw error;
    }
  }

  async list(filter?: ListFilterDto): Promise<InfoDto[]> {
    try {
      const containers = await this.strategy.list();
      if (!filter) return containers;
      return containers.filter((container) => {
        const basicMatch =
          (!filter.id || container.id.includes(filter.id)) &&
          (!filter.name || container.name.includes(filter.name)) &&
          (!filter.image || container.image.includes(filter.image)) &&
          (!filter.status || container.status === filter.status) &&
          (!filter.ports ||
            filter.ports.every((p) => container.ports.includes(p))) &&
          (!filter.createdFrom ||
            new Date(container.createdAt) >= new Date(filter.createdFrom)) &&
          (!filter.createdTo ||
            new Date(container.createdAt) <= new Date(filter.createdTo));
        const labelsMatch =
          !filter.labels ||
          filter.labels.every((filterLabel) => {
            return Object.entries(filterLabel).every(
              ([key, value]) =>
                container.labels && container.labels[key] === value,
            );
          });
        const envMatch =
          !filter.env ||
          filter.env.every((filterEnv) => {
            return Object.entries(filterEnv).every(
              ([key, value]) => container.env && container.env[key] === value,
            );
          });
        return basicMatch && labelsMatch && envMatch;
      });
    } catch (error) {
      this.logError(error, 'Failed to list containers');
      return [];
    }
  }

  async getById(id: string): Promise<InfoDto | undefined> {
    return (await this.strategy.list()).find(
      (container) => container.id === id,
    );
  }

  async logs(id: string, since?: string, tail?: number): Promise<LogDto[]> {
    try {
      return await this.strategy.logs(id, since, tail);
    } catch (error) {
      this.logError(error, `Failed to get logs for ${id}`);
      return [];
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.strategy.remove(id);
    } catch (error) {
      throw error;
    }
  }

  private logError(error: unknown, context: string): void {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.error(
      `${context}: ${message}`,
      error instanceof Error ? error.stack : undefined,
    );
  }
}
