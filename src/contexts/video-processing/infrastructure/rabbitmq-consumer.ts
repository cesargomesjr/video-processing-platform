import { Channel, ChannelModel, connect, ConsumeMessage } from 'amqplib';

export interface RabbitMqConsumerOptions {
  url: string;
  exchange: string;
  queue: string;
  routingKey: string;
  maxRetries: number;
  baseBackoffMs: number;
  handler: (message: ConsumeMessage) => Promise<void>;
}

export class RabbitMqConsumer {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;

  public constructor(private readonly options: RabbitMqConsumerOptions) {}

  public async start(): Promise<void> {
    const { exchange, queue, routingKey } = this.options;
    const retryQueue = `${queue}.retry`;
    const retryRoutingKey = `${routingKey}.retry`;
    const dlqQueue = `${queue}.dlq`;
    const dlqRoutingKey = `${routingKey}.dlq`;

    this.connection = await connect(this.options.url);
    this.channel = await this.connection.createChannel();

    await this.channel.assertExchange(exchange, 'topic', { durable: true });
    await this.channel.assertQueue(queue, { durable: true });
    await this.channel.bindQueue(queue, exchange, routingKey);

    await this.channel.assertQueue(retryQueue, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': exchange,
        'x-dead-letter-routing-key': routingKey,
      },
    });
    await this.channel.bindQueue(retryQueue, exchange, retryRoutingKey);

    await this.channel.assertQueue(dlqQueue, { durable: true });
    await this.channel.bindQueue(dlqQueue, exchange, dlqRoutingKey);

    await this.channel.prefetch(1);
    await this.channel.consume(queue, (message) => {
      void this.handle(message, exchange, retryRoutingKey, dlqRoutingKey);
    });
  }

  public async stop(): Promise<void> {
    if (this.channel !== null) {
      await this.channel.close();
    }

    if (this.connection !== null) {
      await this.connection.close();
    }
  }

  private async handle(
    message: ConsumeMessage | null,
    exchange: string,
    retryRoutingKey: string,
    dlqRoutingKey: string,
  ): Promise<void> {
    if (message === null) {
      return;
    }

    const retryCount = this.parseRetryCount(message);

    try {
      await this.options.handler(message);
      this.channel?.ack(message);
    } catch {
      if (retryCount >= this.options.maxRetries) {
        this.channel?.publish(exchange, dlqRoutingKey, message.content, {
          persistent: true,
          contentType: 'application/json',
          headers: message.properties.headers,
        });
      } else {
        const backoffMs = this.options.baseBackoffMs * 2 ** retryCount;
        this.channel?.publish(exchange, retryRoutingKey, message.content, {
          persistent: true,
          contentType: 'application/json',
          headers: { 'x-retry-count': retryCount + 1 },
          expiration: String(backoffMs),
        });
      }

      this.channel?.ack(message);
    }
  }

  private parseRetryCount(message: ConsumeMessage): number {
    const retryCount = message.properties.headers?.['x-retry-count'] as number | undefined;
    return retryCount ?? 0;
  }
}
