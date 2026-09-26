import {
  IntegrationEventPublisher,
  OutboxRepository,
  type PendingOutboxMessage,
} from '../ports/video-ports.js';
import { DispatchPendingIntegrationEvents } from './dispatch-outbox.js';

const MESSAGE: PendingOutboxMessage = {
  id: '10000000-0000-4000-8000-000000000001',
  eventType: 'VideoUploaded',
  eventVersion: 1,
  occurredAt: new Date('2026-09-26T12:00:00.000Z'),
  attempts: 0,
  correlationId: '20000000-0000-4000-8000-000000000002',
  payload: { videoId: '30000000-0000-4000-8000-000000000003' },
};

class OutboxFake extends OutboxRepository {
  public messages: readonly PendingOutboxMessage[] = [MESSAGE];
  public claims: { batchSize: number; leaseUntil: Date }[] = [];
  public published: { id: string; at: Date }[] = [];
  public retries: { id: string; at: Date; error: string }[] = [];

  public claim(
    batchSize: number,
    leaseUntil: Date,
  ): Promise<readonly PendingOutboxMessage[]> {
    this.claims.push({ batchSize, leaseUntil });
    return Promise.resolve(this.messages);
  }

  public markPublished(id: string, publishedAt: Date): Promise<void> {
    this.published.push({ id, at: publishedAt });
    return Promise.resolve();
  }

  public scheduleRetry(
    id: string,
    availableAt: Date,
    safeError: string,
  ): Promise<void> {
    this.retries.push({ id, at: availableAt, error: safeError });
    return Promise.resolve();
  }
}

class PublisherFake extends IntegrationEventPublisher {
  public messages: PendingOutboxMessage[] = [];
  public error: Error | null = null;

  public publish(message: PendingOutboxMessage): Promise<void> {
    this.messages.push(message);
    return this.error === null ? Promise.resolve() : Promise.reject(this.error);
  }
}

describe('DispatchPendingIntegrationEvents', () => {
  const NOW = new Date('2026-09-26T12:00:00.000Z');

  it('claims with a lease and marks confirmed publications', async () => {
    const outbox = new OutboxFake();
    const publisher = new PublisherFake();
    const dispatcher = new DispatchPendingIntegrationEvents(
      outbox,
      publisher,
      () => NOW,
      () => 0,
    );

    await expect(dispatcher.execute(25)).resolves.toBe(1);

    expect(outbox.claims).toEqual([
      {
        batchSize: 25,
        leaseUntil: new Date('2026-09-26T12:00:30.000Z'),
      },
    ]);
    expect(publisher.messages).toEqual([MESSAGE]);
    expect(outbox.published).toEqual([{ id: MESSAGE.id, at: NOW }]);
    expect(outbox.retries).toEqual([]);
  });

  it('schedules a bounded retry without publishing state', async () => {
    const outbox = new OutboxFake();
    const publisher = new PublisherFake();
    publisher.error = new TypeError('provider details must not be stored');
    const dispatcher = new DispatchPendingIntegrationEvents(
      outbox,
      publisher,
      () => NOW,
      () => 0,
    );

    await expect(dispatcher.execute(25)).resolves.toBe(1);

    expect(outbox.published).toEqual([]);
    expect(outbox.retries).toEqual([
      {
        id: MESSAGE.id,
        at: new Date('2026-09-26T12:00:05.000Z'),
        error: 'TypeError',
      },
    ]);
  });

  it('caps exponential backoff with jitter at five minutes', async () => {
    const outbox = new OutboxFake();
    outbox.messages = [{ ...MESSAGE, attempts: 10 }];
    const publisher = new PublisherFake();
    publisher.error = new Error('temporary broker outage');
    const dispatcher = new DispatchPendingIntegrationEvents(
      outbox,
      publisher,
      () => NOW,
      () => 1,
    );

    await expect(dispatcher.execute(25)).resolves.toBe(1);

    expect(outbox.retries).toEqual([
      {
        id: MESSAGE.id,
        at: new Date('2026-09-26T12:05:00.000Z'),
        error: 'Error',
      },
    ]);
  });

  it('reports an empty batch without invoking the publisher', async () => {
    const outbox = new OutboxFake();
    outbox.messages = [];
    const publisher = new PublisherFake();
    const dispatcher = new DispatchPendingIntegrationEvents(
      outbox,
      publisher,
      () => NOW,
      () => 0,
    );

    await expect(dispatcher.execute(25)).resolves.toBe(0);
    expect(publisher.messages).toEqual([]);
  });
});
