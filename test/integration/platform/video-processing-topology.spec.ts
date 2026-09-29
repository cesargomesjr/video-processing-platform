import { connect } from 'amqplib';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';

import {
  ensureVideoProcessingTopology,
  VIDEO_EVENTS_EXCHANGE,
  VIDEO_PROCESSING_QUEUES,
} from '../../../src/platform/messaging/video-processing-topology';

describe('video processing topology (integration)', () => {
  let rabbitmq: StartedTestContainer;

  beforeAll(async () => {
    rabbitmq = await new GenericContainer('rabbitmq:3-management')
      .withExposedPorts(5672)
      .withWaitStrategy(Wait.forLogMessage(/Server startup complete/))
      .start();
  }, 120_000);

  afterAll(async () => {
    if (rabbitmq !== undefined) {
      await rabbitmq.stop();
    }
  });

  it('creates durable queues and bindings without a worker', async () => {
    const url = `amqp://guest:guest@${rabbitmq.getHost()}:${rabbitmq.getMappedPort(5672)}`;
    await ensureVideoProcessingTopology(url);
    await ensureVideoProcessingTopology(url);

    const connection = await connect(url);
    try {
      const channel = await connection.createChannel();
      try {
        for (const { queue, routingKey } of VIDEO_PROCESSING_QUEUES) {
          expect((await channel.checkQueue(queue)).messageCount).toBe(0);
          await channel.checkQueue(`${queue}.retry`);
          await channel.checkQueue(`${queue}.dlq`);
          channel.publish(VIDEO_EVENTS_EXCHANGE, routingKey, Buffer.from('test'));
        }

        for (const { queue } of VIDEO_PROCESSING_QUEUES) {
          expect((await channel.checkQueue(queue)).messageCount).toBe(1);
        }
      } finally {
        await channel.close();
      }
    } finally {
      await connection.close();
    }
  });
});
