import { connect, type ChannelModel, type ConfirmChannel } from 'amqplib';
import {
  IntegrationEventPublisher,
  type PendingOutboxMessage,
} from '../../application/ports/video-ports.js';

const EXCHANGE = 'video.events';
const QUEUE = 'video.analysis';
const ROUTING_KEY = 'video.uploaded.v1';

export class RabbitMqIntegrationEventPublisher extends IntegrationEventPublisher {
  private connection: ChannelModel | null = null;
  private channel: ConfirmChannel | null = null;

  public constructor(private readonly url: string) {
    super();
  }

  private async getChannel(): Promise<ConfirmChannel> {
    if (this.channel !== null) return this.channel;
    const connection = await connect(this.url);
    const channel = await connection.createConfirmChannel();
    const reset = (): void => {
      if (this.channel === channel) this.channel = null;
      if (this.connection === connection) this.connection = null;
    };
    connection.once('close', reset);
    channel.once('close', reset);
    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    await channel.assertQueue(QUEUE, { durable: true });
    await channel.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY);
    this.connection = connection;
    this.channel = channel;
    return channel;
  }

  public override async publish(message: PendingOutboxMessage): Promise<void> {
    const channel = await this.getChannel();
    const envelope = {
      eventId: message.id,
      eventType: message.eventType,
      eventVersion: message.eventVersion,
      occurredAt: message.occurredAt.toISOString(),
      correlationId: message.correlationId,
      payload: message.payload,
    };
    try {
      channel.publish(
        EXCHANGE,
        ROUTING_KEY,
        Buffer.from(JSON.stringify(envelope)),
        {
          persistent: true,
          contentType: 'application/json',
          messageId: message.id,
          type: `${message.eventType}.v${String(message.eventVersion)}`,
          correlationId: message.correlationId,
          timestamp: message.occurredAt.getTime(),
        },
      );
      await channel.waitForConfirms();
    } catch (error: unknown) {
      this.channel = null;
      this.connection = null;
      throw error;
    }
  }

  public async isReady(): Promise<boolean> {
    try {
      await this.getChannel();
      return true;
    } catch {
      this.channel = null;
      this.connection = null;
      return false;
    }
  }

  public async close(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
    this.channel = null;
    this.connection = null;
  }
}
