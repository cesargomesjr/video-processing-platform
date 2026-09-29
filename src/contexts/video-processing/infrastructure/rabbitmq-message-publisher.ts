import { Channel, ChannelModel, connect } from 'amqplib';
import { getCorrelationId } from '../../../platform/logger/correlation-context';
import { generateTraceparent } from '../../../platform/tracing/traceparent';

import {
  MessagePublisher,
  VideoAnalyzedEvent,
  AllChunksCompletedEvent,
  ChunkCompletedEvent,
  ChunkFailedEvent,
  ProcessVideoChunkEvent,
  VideoCompletedEvent,
  VideoProcessingFailedEvent,
} from '../application/ports/message-publisher';

const EXCHANGE = 'video.events';

export class RabbitMqMessagePublisher implements MessagePublisher {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;

  public constructor(private readonly url: string) {}

  public async publishVideoAnalyzed(event: VideoAnalyzedEvent): Promise<void> {
    await this.publish('video.analyzed', event);
  }

  public async publishProcessVideoChunk(event: ProcessVideoChunkEvent): Promise<void> {
    await this.publish('video.chunk.process', event);
  }

  public async publishChunkCompleted(event: ChunkCompletedEvent): Promise<void> {
    await this.publish('video.chunk.completed', event);
  }

  public async publishChunkFailed(event: ChunkFailedEvent): Promise<void> {
    await this.publish('video.chunk.failed', event);
  }

  public async publishAllChunksCompleted(event: AllChunksCompletedEvent): Promise<void> {
    await this.publish('video.chunks.all', event);
  }

  public async publishVideoCompleted(event: VideoCompletedEvent): Promise<void> {
    await this.publish('video.completed', event);
  }

  public async publishVideoProcessingFailed(event: VideoProcessingFailedEvent): Promise<void> {
    await this.publish('video.failed', event);
  }

  public async close(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
    this.channel = null;
    this.connection = null;
  }

  private async publish(routingKey: string, event: unknown): Promise<void> {
    const channel = await this.getChannel();
    const correlationId = getCorrelationId();
    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    channel.publish(EXCHANGE, routingKey, Buffer.from(JSON.stringify(event)), {
      persistent: true,
      contentType: 'application/json',
      headers: {
        traceparent: generateTraceparent(),
        ...(correlationId === undefined ? {} : { 'x-correlation-id': correlationId }),
      },
    });
  }

  private async getChannel(): Promise<Channel> {
    if (this.channel !== null) {
      return this.channel;
    }

    this.connection = await connect(this.url);
    this.channel = await this.connection.createChannel();
    return this.channel;
  }
}
