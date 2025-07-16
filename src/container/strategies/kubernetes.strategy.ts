import { Injectable, Logger } from '@nestjs/common';
import { BaseStrategy } from './base.strategy';
import { DeployConfigDto } from '@dto/deploy-config.dto';
import { InfoDto } from '@dto/info.dto';
import { LogDto } from '@dto/log.dto';

@Injectable()
export class KubernetesStrategy extends BaseStrategy {
  start(id: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
  stop(id: string, timeout?: number): Promise<void> {
    throw new Error('Method not implemented.');
  }
  deploy(config: DeployConfigDto): Promise<string> {
    throw new Error('Method not implemented.');
  }
  list(): Promise<InfoDto[]> {
    throw new Error('Method not implemented.');
  }
  remove(id: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
  logs(id: string, since?: string, tail?: number): Promise<LogDto[]> {
    throw new Error('Method not implemented.');
  }
  private readonly logger = new Logger(KubernetesStrategy.name);
}
