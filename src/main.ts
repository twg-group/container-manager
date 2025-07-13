import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import * as process from 'process';

dotenv.config();
dotenv.config({ path: `.env.local`, override: true });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  console.log(process.env.PORT);
  await app.listen(process.env.PORT || 3000);
}
bootstrap().catch((e) => console.error(e));
