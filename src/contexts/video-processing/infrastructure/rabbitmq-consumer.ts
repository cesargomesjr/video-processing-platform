import { randomUUID } from 'node:crypto';
import { Channel, ChannelModel, connect, ConsumeMessage } from 'amqplib';

import { runWithCorrelationId } from '../../../platform/logger/correlation-context';
import type { PinoLogger } from '../../../platform/logger/pino.logger';
import { traceIdFrom } from '../../../platform/tracing/traceparent';

export interface RabbitMqConsumerOptions {
  url: string;
  exchange: string;
  queue: string;
  routingKey: string;
  maxRetries: number;
  baseBackoffMs: number;
  handler: (message: ConsumeMessage) => Promise<void>;
  logger?: Pick<PinoLogger, 'info' | 'error'>;
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
    const headers = message.properties.headers ?? {};
    const incomingId: unknown = headers['x-correlation-id'];
    const traceparent: unknown = headers.traceparent;
    const correlationId =
      (typeof incomingId === 'string' && incomingId.length > 0 ? incomingId : undefined) ??
      traceIdFrom(typeof traceparent === 'string' ? traceparent : undefined) ??
      randomUUID();
    const details = {
      queue: this.options.queue,
      routingKey: this.options.routingKey,
      retryCount,
      ...this.messageIdentifiers(message),
    };

    await runWithCorrelationId(correlationId, async () => {
      this.options.logger?.info(details, 'worker.message.started');
      try {
        await this.options.handler(message);
        this.options.logger?.info(details, 'worker.message.completed');
        this.channel?.ack(message);
      } catch (error) {
        this.options.logger?.error(error);
        if (retryCount >= this.options.maxRetries) {
          this.channel?.publish(exchange, dlqRoutingKey, message.content, {
            persistent: true,
            contentType: 'application/json',
            headers: { ...headers, 'x-correlation-id': correlationId },
          });
          this.options.logger?.info(details, 'worker.message.dead_lettered');
        } else {
          const backoffMs = this.options.baseBackoffMs * 2 ** retryCount;
          this.channel?.publish(exchange, retryRoutingKey, message.content, {
            persistent: true,
            contentType: 'application/json',
            headers: {
              ...headers,
              'x-correlation-id': correlationId,
              'x-retry-count': retryCount + 1,
            },
            expiration: String(backoffMs),
          });
          this.options.logger?.info(details, 'worker.message.retrying');
        }

        this.channel?.ack(message);
      }
    });
  }

  private messageIdentifiers(message: ConsumeMessage): { videoId?: string; userId?: string } {
    try {
      const payload: unknown = JSON.parse(message.content.toString());
      if (payload === null || typeof payload !== 'object') {
        return {};
      }
      const record = payload as Record<string, unknown>;
      return {
        ...(typeof record.videoId === 'string' ? { videoId: record.videoId } : {}),
        ...(typeof record.ownerId === 'string' ? { userId: record.ownerId } : {}),
      };
    } catch {
      return {};
    }
  }

  private parseRetryCount(message: ConsumeMessage): number {
    const retryCount = message.properties.headers?.['x-retry-count'] as number | undefined;
    return retryCount ?? 0;
  }
}
