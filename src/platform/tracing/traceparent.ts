import { randomBytes } from 'node:crypto';

export function generateTraceparent(): string {
  const traceId = randomBytes(16).toString('hex');
  const spanId = randomBytes(8).toString('hex');
  return `00-${traceId}-${spanId}-01`;
}

export function traceIdFrom(traceparent: string | undefined): string | undefined {
  if (traceparent === undefined) {
    return undefined;
  }

  return traceparent.split('-')[1];
}
