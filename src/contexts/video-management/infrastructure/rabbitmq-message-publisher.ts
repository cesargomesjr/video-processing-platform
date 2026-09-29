import { Channel, ChannelModel, connect } from 'amqplib';
import { getCorrelationId } from '../../../platform/logger/correlation-context';
import { generateTraceparent } from '../../../platform/tracing/traceparent';

import { MessagePublisher, VideoUploadedEvent } from '../application/ports/message-publisher';

const EXCHANGE = 'video.events';
const VIDEO_UPLOADED_ROUTING_KEY = 'video.uploaded';

export class RabbitMQMessagePublisher implements MessagePublisher {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;

  public constructor(private readonly url: string) {}

  public async publishVideoUploaded(event: VideoUploadedEvent): Promise<void> {
    const channel = await this.getChannel();
    const correlationId = getCorrelationId();

    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    channel.publish(EXCHANGE, VIDEO_UPLOADED_ROUTING_KEY, Buffer.from(JSON.stringify(event)), {
      persistent: true,
      contentType: 'application/json',
      messageId: event.videoId,
      headers: {
        traceparent: generateTraceparent(),
        ...(correlationId === undefined ? {} : { 'x-correlation-id': correlationId }),
      },
    });
  }

  public async close(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
    this.channel = null;
    this.connection = null;
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
