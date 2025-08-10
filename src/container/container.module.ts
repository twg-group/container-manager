import { DynamicModule, Module } from '@nestjs/common';
import { DockerStrategy, KubernetesStrategy, SwarmStrategy } from '@strategies';
import { ContainerController } from './container.controller';
import { ContainerService } from './container.service';
import { CONTAINER_STRATEGY } from './constants';

@Module({})
export class ContainerModule {
  private static getStrategy(type: string) {
    switch (type) {
      case 'docker':
        return DockerStrategy;
      case 'swarm':
        return SwarmStrategy;
      case 'kubernetes':
        return KubernetesStrategy;
      default:
        throw new Error(`Unsupported strategy: ${type}`);
    }
  }

  static forRoot(): DynamicModule {
    const type = (process.env[CONTAINER_STRATEGY] || 'docker').toLowerCase();
    const strategy = ContainerModule.getStrategy(type);
    return {
      module: ContainerModule,
      controllers: [ContainerController],
      providers: [
        {
          provide: CONTAINER_STRATEGY,
          useClass: strategy,
        },
        ContainerService,
      ],
      exports: [ContainerService],
    };
  }
}
