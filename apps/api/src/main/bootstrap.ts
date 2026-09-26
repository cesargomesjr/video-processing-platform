import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { loadAppConfig } from './config/load-app-config.js';

async function bootstrap(): Promise<void> {
  const config = loadAppConfig(process.env);
  const application = await NestFactory.create(AppModule);

  await application.listen(config.port);
}

void bootstrap();
