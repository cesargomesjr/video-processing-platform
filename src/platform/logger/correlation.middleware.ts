import { randomUUID } from 'node:crypto';

import { runWithCorrelationId } from './correlation-context';
import type { StructuredLogger } from './pino.logger';

export const CORRELATION_HEADER = 'x-correlation-id';

const SAFE_CORRELATION_ID = /^[A-Za-z0-9._-]{1,128}$/;

export interface CorrelationRequest {
  method: string;
  originalUrl: string;
  header(name: string): string | undefined;
}

export interface CorrelationResponse {
  statusCode: number;
  setHeader(name: string, value: string): void;
  on(event: 'finish', listener: () => void): void;
}

export type CorrelationNext = () => void;

export interface CorrelationMiddlewareDependencies {
  logger: StructuredLogger;
  generateId?: () => string;
}

export function createCorrelationMiddleware(
  dependencies: CorrelationMiddlewareDependencies,
): (request: CorrelationRequest, response: CorrelationResponse, next: CorrelationNext) => void {
  const { logger, generateId = randomUUID } = dependencies;

  return function correlationMiddleware(
    request: CorrelationRequest,
    response: CorrelationResponse,
    next: CorrelationNext,
  ): void {
    const incoming = request.header(CORRELATION_HEADER);
    const correlationId =
      incoming !== undefined && SAFE_CORRELATION_ID.test(incoming) ? incoming : generateId();

    response.setHeader(CORRELATION_HEADER, correlationId);
    const startedAt = process.hrtime.bigint();

    runWithCorrelationId(correlationId, () => {
      response.on('finish', () => {
        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
        logger.info(
          {
            correlationId,
            method: request.method,
            url: request.originalUrl,
            statusCode: response.statusCode,
            durationMs,
          },
          'http.request.completed',
        );
      });

      next();
    });
  };
}
