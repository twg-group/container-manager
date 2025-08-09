import { Injectable } from '@nestjs/common';
import { BaseStrategy } from './base.strategy';
import { DeployConfigDto } from '@dto/deploy-config.dto';
import { InfoDto } from '@dto/info.dto';
import { LogDto } from '@dto/log.dto';

@Injectable()
export class KubernetesStrategy extends BaseStrategy {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  start(id: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  stop(id: string, timeout?: number): Promise<void> {
    throw new Error('Method not implemented.');
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  deploy(config: DeployConfigDto): Promise<string> {
    throw new Error('Method not implemented.');
  }
  list(): Promise<InfoDto[]> {
    throw new Error('Method not implemented.');
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  remove(id: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  logs(id: string, since?: string, tail?: number): Promise<LogDto[]> {
    throw new Error('Method not implemented.');
  }
}
