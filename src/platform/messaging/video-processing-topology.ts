import { connect } from 'amqplib';

export const VIDEO_EVENTS_EXCHANGE = 'video.events';

export const VIDEO_PROCESSING_QUEUES = [
  { queue: 'video.uploaded.analyzer', routingKey: 'video.uploaded' },
  { queue: 'video.analyzed.orchestrator', routingKey: 'video.analyzed' },
  { queue: 'video.chunk.process.worker', routingKey: 'video.chunk.process' },
  { queue: 'video.chunk.completed.aggregator', routingKey: 'video.chunk.completed' },
  { queue: 'video.chunk.failed.aggregator', routingKey: 'video.chunk.failed' },
  { queue: 'video.chunks.all.packager', routingKey: 'video.chunks.all' },
  { queue: 'video.completed.notification', routingKey: 'video.completed' },
  { queue: 'video.failed.notification', routingKey: 'video.failed' },
] as const;

export async function ensureVideoProcessingTopology(url: string): Promise<void> {
  const connection = await connect(url);
  try {
    const channel = await connection.createChannel();
    try {
      await channel.assertExchange(VIDEO_EVENTS_EXCHANGE, 'topic', { durable: true });
      for (const { queue, routingKey } of VIDEO_PROCESSING_QUEUES) {
        await channel.assertQueue(queue, { durable: true });
        await channel.bindQueue(queue, VIDEO_EVENTS_EXCHANGE, routingKey);

        const retryQueue = `${queue}.retry`;
        const retryRoutingKey = `${routingKey}.retry`;
        await channel.assertQueue(retryQueue, {
          durable: true,
          arguments: {
            'x-dead-letter-exchange': VIDEO_EVENTS_EXCHANGE,
            'x-dead-letter-routing-key': routingKey,
          },
        });
        await channel.bindQueue(retryQueue, VIDEO_EVENTS_EXCHANGE, retryRoutingKey);

        const dlqQueue = `${queue}.dlq`;
        await channel.assertQueue(dlqQueue, { durable: true });
        await channel.bindQueue(dlqQueue, VIDEO_EVENTS_EXCHANGE, `${routingKey}.dlq`);
      }
    } finally {
      await channel.close();
    }
  } finally {
    await connection.close();
  }
}
