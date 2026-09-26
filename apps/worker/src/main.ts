import { loadAppConfig } from '../../../src/platform/config/app-config.schema';
import { PinoLogger } from '../../../src/platform/logger/pino.logger';

function main(): void {
  loadAppConfig();
  const logger = new PinoLogger();
  logger.info({}, 'worker.bootstrapping');
}

main();
