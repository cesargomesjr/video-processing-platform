import { Channel, ChannelModel, connect } from 'amqplib';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';

import { RabbitMqConsumer } from '../../../src/contexts/video-processing/infrastructure/rabbitmq-consumer';

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

    const consumer = new RabbitMqConsumer({
      url,
      exchange: EXCHANGE,
      queue,
      routingKey,
      maxRetries: 2,
      baseBackoffMs: 100,
      handler: (): Promise<void> => {
        calls += 1;
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
    });

    await waitFor(() => succeeded, 10_000);
    expect(calls).toBe(3);
    await consumer.stop();
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
    });

    await waitFor(async () => {
      const message = await publisher.get(`${queue}.dlq`, { noAck: true });
      return message !== false;
    }, 10_000);

    expect(calls).toBe(2);
    await consumer.stop();
  });
});
