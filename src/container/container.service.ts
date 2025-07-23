import { Injectable, Inject, Logger } from '@nestjs/common';
import { BaseStrategy } from '@strategies';
import { DeployConfigDto, InfoDto, LogDto } from '@dto';
import { ListFilterDto } from '@dto/list-filter.dto';

@Injectable()
export class ContainerService {
  private readonly logger = new Logger(ContainerService.name);

  constructor(
    @Inject('CONTAINER_STRATEGY')
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
      const list = await this.strategy.list();
      if (!filter) {
        return list;
      }
      return list.filter(
        (dto) =>
          (!filter.id || dto.id.includes(filter.id)) &&
          (!filter.name || dto.name.includes(filter.name)) &&
          (!filter.image || dto.image.includes(filter.image)) &&
          (!filter.status || dto.status === filter.status) &&
          (!filter.ports ||
            filter.ports.every((port) => dto.ports.includes(port))) &&
          (!filter.createdFrom ||
            new Date(dto.createdAt) >= new Date(filter.createdFrom)) &&
          (!filter.createdTo ||
            new Date(dto.createdAt) <= new Date(filter.createdTo)),
      );
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
      this.logError(error, `Failed to remove ${id}`);
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
