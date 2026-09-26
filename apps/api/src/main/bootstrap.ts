import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DatabaseMigrationRunner } from '../platform/database/database-migration-runner.js';
import { AppModule } from './app.module.js';
import { APP_CONFIG } from './config/config.module.js';
import type { AppConfig } from './config/load-app-config.js';

async function bootstrap(): Promise<void> {
  const application = await NestFactory.create(AppModule);
  const config = application.get<AppConfig>(APP_CONFIG);
  const migrationRunner = application.get(DatabaseMigrationRunner);

  application.enableShutdownHooks();
  await migrationRunner.run();

  await application.listen(config.port);
}

void bootstrap();
