import { Channel, ChannelModel, connect } from 'amqplib';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';

import { VideoUploadedEvent } from '../../../src/contexts/video-management/application/ports/message-publisher';
import { RabbitMQMessagePublisher } from '../../../src/contexts/video-management/infrastructure/rabbitmq-message-publisher';

describe('RabbitMQMessagePublisher', () => {
  let container: StartedTestContainer;
  let connection: ChannelModel;
  let channel: Channel;
  let queueName: string;
  let publisher: RabbitMQMessagePublisher;

  beforeAll(async () => {
    container = await new GenericContainer('rabbitmq:3-management')
      .withExposedPorts(5672, 15672)
      .withEnvironment({
        RABBITMQ_DEFAULT_USER: 'fiapx',
        RABBITMQ_DEFAULT_PASS: 'fiapx',
      })
      .withWaitStrategy(Wait.forLogMessage(/Server startup complete/))
      .start();

    const url = `amqp://fiapx:fiapx@${container.getHost()}:${container.getMappedPort(5672)}`;
    publisher = new RabbitMQMessagePublisher(url);

    connection = await connect(url);
    channel = await connection.createChannel();
    await channel.assertExchange('video.events', 'topic', { durable: true });
    const queue = await channel.assertQueue('', { exclusive: true });
    queueName = queue.queue;
    await channel.bindQueue(queueName, 'video.events', 'video.uploaded');
  }, 120_000);

  afterAll(async () => {
    if (channel !== undefined) {
      await channel.close();
    }

    if (connection !== undefined) {
      await connection.close();
    }

    if (container !== undefined) {
      await container.stop();
    }
  });

  it('publishes a VideoUploaded event to the topic exchange', async () => {
    const event: VideoUploadedEvent = {
      videoId: '11111111-1111-1111-1111-111111111111',
      ownerId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      storageKey: 'original/user/video.mp4',
      format: 'mp4',
      sizeBytes: 1024,
    };

    await publisher.publishVideoUploaded(event);
    await publisher.publishVideoUploaded(event);

    let message = await channel.get(queueName, { noAck: true });
    for (let attempt = 0; attempt < 10 && message === false; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      message = await channel.get(queueName, { noAck: true });
    }

    expect(message).not.toBe(false);
    if (message !== false) {
      const received = JSON.parse(message.content.toString()) as VideoUploadedEvent;
      expect(received).toEqual(event);
      expect(message.properties.contentType).toBe('application/json');
    }
  });
});
