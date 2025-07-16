import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ContainerModule } from './container/container.module';

@Module({
  imports: [ContainerModule.forRoot()],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
