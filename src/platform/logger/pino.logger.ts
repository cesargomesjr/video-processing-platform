import { LoggerService } from '@nestjs/common';
import { pino, type DestinationStream, type Logger } from 'pino';

import { getCorrelationId } from './correlation-context';

export interface StructuredLogger {
  info(obj: Record<string, unknown>, message: string): void;
}

export interface PinoLoggerOptions {
  level?: string;
  stream?: DestinationStream;
}

type PinoLevel = 'info' | 'error' | 'warn' | 'debug' | 'trace' | 'fatal';

export class PinoLogger implements LoggerService, StructuredLogger {
  private readonly logger: Logger;

  public constructor(options: PinoLoggerOptions = {}) {
    this.logger = pino(
      {
        level: options.level ?? 'info',
        mixin: () => {
          const correlationId = getCorrelationId();
          return correlationId === undefined ? {} : { correlationId };
        },
        redact: {
          paths: [
            'req.headers.authorization',
            'password',
            'secret',
            'secretKey',
            'accessKey',
            'token',
            '*.password',
            '*.secret',
            '*.secretKey',
            '*.accessKey',
            '*.token',
            '*.authorization',
          ],
          censor: '[REDACTED]',
        },
      },
      options.stream,
    );
  }

  public info(obj: Record<string, unknown>, message: string): void {
    this.logger.info(obj, message);
  }

  public log(message: unknown, ...optionalParams: unknown[]): void {
    this.write('info', message, optionalParams);
  }

  public error(message: unknown, ...optionalParams: unknown[]): void {
    this.write('error', message, optionalParams);
  }

  public warn(message: unknown, ...optionalParams: unknown[]): void {
    this.write('warn', message, optionalParams);
  }

  public debug(message: unknown, ...optionalParams: unknown[]): void {
    this.write('debug', message, optionalParams);
  }

  public verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.write('trace', message, optionalParams);
  }

  public fatal(message: unknown, ...optionalParams: unknown[]): void {
    this.write('fatal', message, optionalParams);
  }

  private write(level: PinoLevel, message: unknown, optionalParams: unknown[]): void {
    const context = optionalParams.find((param): param is string => typeof param === 'string');
    const obj: Record<string, unknown> = context === undefined ? {} : { context };
    const msg = message instanceof Error ? message.message : String(message);

    if (message instanceof Error) {
      obj.err = message;
    }

    this.writeLine(level, obj, msg);
  }

  private writeLine(level: PinoLevel, obj: Record<string, unknown>, msg: string): void {
    switch (level) {
      case 'info':
        this.logger.info(obj, msg);
        break;
      case 'error':
        this.logger.error(obj, msg);
        break;
      case 'warn':
        this.logger.warn(obj, msg);
        break;
      case 'debug':
        this.logger.debug(obj, msg);
        break;
      case 'trace':
        this.logger.trace(obj, msg);
        break;
      case 'fatal':
        this.logger.fatal(obj, msg);
        break;
    }
  }
}
