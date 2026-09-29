import { Channel, ChannelModel, connect, ConsumeMessage } from 'amqplib';

import { CompleteVideoUseCase } from '../application/complete-video.use-case';

const EXCHANGE = 'video.events';
const QUEUE = 'video.uploaded.worker';
const ROUTING_KEY = 'video.uploaded';

interface VideoUploadedPayload {
  videoId: string;
}

export class VideoUploadedConsumer {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;

  public constructor(
    private readonly url: string,
    private readonly completeVideo: CompleteVideoUseCase,
  ) {}

  public async start(): Promise<void> {
    this.connection = await connect(this.url);
    this.channel = await this.connection.createChannel();

    await this.channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    await this.channel.assertQueue(QUEUE, { durable: true });
    await this.channel.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY);
    await this.channel.consume(QUEUE, (message) => {
      void this.handle(message);
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

  private async handle(message: ConsumeMessage | null): Promise<void> {
    if (message === null) {
      return;
    }

    try {
      const payload = this.parsePayload(message.content.toString());
      await this.completeVideo.execute(payload.videoId);
      this.channel?.ack(message);
    } catch {
      this.channel?.nack(message, false, true);
    }
  }

  private parsePayload(raw: string): VideoUploadedPayload {
    const payload = JSON.parse(raw) as Partial<VideoUploadedPayload>;

    if (typeof payload.videoId !== 'string' || payload.videoId.trim().length === 0) {
      throw new Error('Invalid VideoUploaded payload');
    }

    return { videoId: payload.videoId };
  }
}
