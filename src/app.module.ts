import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ContainerModule } from './container/container.module';
import { LoggerModule } from '@twg-group/nestjs-logger';
import { loggerOptions } from './logger.options';

@Module({
  imports: [LoggerModule.forRoot({ loggerOptions }), ContainerModule.forRoot()],
  controllers: [AppController],
})
export class AppModule {}
