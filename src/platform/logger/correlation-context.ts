import { AsyncLocalStorage } from 'node:async_hooks';

interface CorrelationStore {
  correlationId: string;
}

const correlationContext = new AsyncLocalStorage<CorrelationStore>();

export function getCorrelationId(): string | undefined {
  return correlationContext.getStore()?.correlationId;
}

export function runWithCorrelationId<T>(correlationId: string, callback: () => T): T {
  return correlationContext.run({ correlationId }, callback);
}
