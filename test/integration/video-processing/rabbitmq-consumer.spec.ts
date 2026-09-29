import { Channel, ChannelModel, connect } from 'amqplib';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';

import { RabbitMqConsumer } from '../../../src/contexts/video-processing/infrastructure/rabbitmq-consumer';
import { getCorrelationId } from '../../../src/platform/logger/correlation-context';

const EXCHANGE = 'video.events';

async function waitFor(
  predicate: () => Promise<boolean> | boolean,
  timeoutMs: number,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await predicate()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  throw new Error('Timed out waiting for condition');
}

describe('RabbitMqConsumer', () => {
  let container: StartedTestContainer;
  let connection: ChannelModel;
  let publisher: Channel;
  let url: string;

  beforeAll(async () => {
    container = await new GenericContainer('rabbitmq:3-management')
      .withExposedPorts(5672, 15672)
      .withEnvironment({
        RABBITMQ_DEFAULT_USER: 'fiapx',
        RABBITMQ_DEFAULT_PASS: 'fiapx',
      })
      .withWaitStrategy(Wait.forLogMessage(/Server startup complete/))
      .start();

    url = `amqp://fiapx:fiapx@${container.getHost()}:${container.getMappedPort(5672)}`;
    connection = await connect(url);
    publisher = await connection.createChannel();
    await publisher.assertExchange(EXCHANGE, 'topic', { durable: true });
  }, 120_000);

  afterAll(async () => {
    if (publisher !== undefined) {
      await publisher.close();
    }

    if (connection !== undefined) {
      await connection.close();
    }

    if (container !== undefined) {
      await container.stop();
    }
  });

  it('retries with backoff and acknowledges when the handler succeeds', async () => {
    const queue = 'retry.spec';
    const routingKey = 'retry.event';
    let calls = 0;
    let succeeded = false;
    const observedIds: Array<string | undefined> = [];
    const observedTraceparents: unknown[] = [];

    const consumer = new RabbitMqConsumer({
      url,
      exchange: EXCHANGE,
      queue,
      routingKey,
      maxRetries: 2,
      baseBackoffMs: 100,
      handler: (message): Promise<void> => {
        calls += 1;
        observedIds.push(getCorrelationId());
        observedTraceparents.push(message.properties.headers?.traceparent);
        if (calls < 3) {
          return Promise.reject(new Error('transient failure'));
        }
        succeeded = true;
        return Promise.resolve();
      },
    });

    await consumer.start();
    publisher.publish(EXCHANGE, routingKey, Buffer.from(JSON.stringify({ id: 1 })), {
      persistent: true,
      contentType: 'application/json',
      headers: {
        'x-correlation-id': 'corr-retry-123',
        traceparent: '00-11111111111111111111111111111111-2222222222222222-01',
      },
    });

    await waitFor(() => succeeded, 10_000);
    expect(calls).toBe(3);
    expect(observedIds).toEqual(['corr-retry-123', 'corr-retry-123', 'corr-retry-123']);
    expect(observedTraceparents).toEqual(
      Array(3).fill('00-11111111111111111111111111111111-2222222222222222-01'),
    );
    await consumer.stop();
  });

  it('processes one message at a time per consumer', async () => {
    const queue = `prefetch.spec.${Date.now()}`;
    const routingKey = queue;
    let calls = 0;
    let active = 0;
    let maxActive = 0;
    let releaseFirst: () => void = () => undefined;
    const firstBlocked = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const consumer = new RabbitMqConsumer({
      url,
      exchange: EXCHANGE,
      queue,
      routingKey,
      maxRetries: 1,
      baseBackoffMs: 50,
      handler: async (): Promise<void> => {
        calls += 1;
        active += 1;
        maxActive = Math.max(maxActive, active);
        if (calls === 1) {
          await firstBlocked;
        }
        active -= 1;
      },
    });

    await consumer.start();
    try {
      for (let index = 0; index < 2; index += 1) {
        publisher.publish(EXCHANGE, routingKey, Buffer.from(JSON.stringify({ index })));
      }

      await waitFor(() => calls === 1, 5_000);
      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(calls).toBe(1);

      releaseFirst();
      await waitFor(() => calls === 2 && active === 0, 5_000);
      expect(maxActive).toBe(1);
    } finally {
      releaseFirst();
      await consumer.stop();
    }
  });

  it('sends the message to the DLQ after exhausting retries', async () => {
    const queue = 'dlq.spec';
    const routingKey = 'dlq.event';
    let calls = 0;

    const consumer = new RabbitMqConsumer({
      url,
      exchange: EXCHANGE,
      queue,
      routingKey,
      maxRetries: 1,
      baseBackoffMs: 50,
      handler: (): Promise<void> => {
        calls += 1;
        return Promise.reject(new Error('permanent failure'));
      },
    });

    await consumer.start();
    publisher.publish(EXCHANGE, routingKey, Buffer.from(JSON.stringify({ id: 2 })), {
      persistent: true,
      contentType: 'application/json',
      headers: { 'x-correlation-id': 'corr-dlq-123' },
    });

    let deadLetterId: unknown;
    await waitFor(async () => {
      const message = await publisher.get(`${queue}.dlq`, { noAck: true });
      if (message === false) {
        return false;
      }
      deadLetterId = message.properties.headers?.['x-correlation-id'];
      return true;
    }, 10_000);

    expect(calls).toBe(2);
    expect(deadLetterId).toBe('corr-dlq-123');
    await consumer.stop();
  });
});
