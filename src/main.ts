import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from '@twg-group/nestjs-logger';
import process from 'process';
import { loggerOptions } from './logger.options';

dotenv.config();

const logger = new Logger(undefined, loggerOptions);

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  const port = process.env.PORT || 3000;
  await app.listen(port).then(() => {
    logger.info(
      `Application is running on: http://localhost:${port}`,
      'NestApplication',
    );
    logger.debug(`DEBUG MODE: ON`, 'NestApplication');
  });
}

void bootstrap();
