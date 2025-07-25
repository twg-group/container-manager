import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ContainerModule } from './container/container.module';

@Module({
  imports: [ContainerModule.forRoot()],
  controllers: [AppController],
})
export class AppModule {}
