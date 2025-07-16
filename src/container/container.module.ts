import { DynamicModule, Logger, Module } from '@nestjs/common';
import { DockerStrategy, KubernetesStrategy, SwarmStrategy } from '@strategies';
import { ContainerController } from './container.controller';
import { ContainerService } from './container.service';

@Module({})
export class ContainerModule {
  private static logger = new Logger(ContainerModule.name);

  private static getStrategy(type: string) {
    switch (type) {
      case 'docker':
        return new DockerStrategy();
      case 'swarm':
        return new SwarmStrategy();
      case 'kubernetes':
        return new KubernetesStrategy();
      default:
        return undefined;
    }
  }

  static forRoot(): DynamicModule {
    return {
      module: ContainerModule,
      controllers: [ContainerController],
      providers: [
        {
          provide: 'CONTAINER_STRATEGY',
          useFactory: () => {
            const strategyType = (
              process.env.CONTAINER_STRATEGY || 'docker'
            ).toLowerCase();
            ContainerModule.logger.log(`Initializing ${strategyType} strategy`);
            const strategy = ContainerModule.getStrategy(strategyType);
            if (!strategy) {
              const error = new Error(
                `Failed to initialize strategy: ${strategyType}`,
              );
              ContainerModule.logger.error(error.message);
              throw error;
            }
            return strategy;
          },
        },
        ContainerService,
      ],
      exports: [ContainerService],
    };
  }
}
