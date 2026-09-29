import { ConsumeMessage } from 'amqplib';

import { AggregateChunksUseCase } from '../contexts/video-processing/application/aggregate-chunks.use-case';
import { AnalyzeVideoUseCase } from '../contexts/video-processing/application/analyze-video.use-case';
import { NotifyProcessingCompletionUseCase } from '../contexts/notification/application/notify-processing-completion.use-case';
import { NotifyProcessingFailureUseCase } from '../contexts/notification/application/notify-processing-failure.use-case';
import { PackageArchiveUseCase } from '../contexts/video-processing/application/package-archive.use-case';
import { PlanChunksUseCase } from '../contexts/video-processing/application/plan-chunks.use-case';
import {
  ProcessChunkInput,
  ProcessChunkUseCase,
} from '../contexts/video-processing/application/process-chunk.use-case';
import { RabbitMqConsumer } from '../contexts/video-processing/infrastructure/rabbitmq-consumer';
import type { PinoLogger } from '../platform/logger/pino.logger';
import { VIDEO_PROCESSING_QUEUES } from '../platform/messaging/video-processing-topology';

const EXCHANGE = 'video.events';

interface VideoProcessingPipelineOptions {
  url: string;
  analyze: AnalyzeVideoUseCase;
  planChunks: PlanChunksUseCase;
  processChunk: ProcessChunkUseCase;
  aggregate: AggregateChunksUseCase;
  packageArchive: PackageArchiveUseCase;
  notifyFailure?: NotifyProcessingFailureUseCase;
  notifyCompletion?: NotifyProcessingCompletionUseCase;
  logger?: Pick<PinoLogger, 'info' | 'error'>;
}

export class VideoProcessingPipeline {
  private readonly consumers: RabbitMqConsumer[] = [];

  public constructor(private readonly options: VideoProcessingPipelineOptions) {}

  public async start(): Promise<void> {
    const consumer = (
      routingKey: string,
      handler: (message: ConsumeMessage) => Promise<void>,
    ): RabbitMqConsumer => {
      const entry = VIDEO_PROCESSING_QUEUES.find((item) => item.routingKey === routingKey);
      if (entry === undefined) {
        throw new Error(`No queue configured for ${routingKey}`);
      }

      return new RabbitMqConsumer({
        url: this.options.url,
        exchange: EXCHANGE,
        queue: entry.queue,
        routingKey,
        maxRetries: 3,
        baseBackoffMs: 100,
        handler,
        logger: this.options.logger,
      });
    };

    this.consumers.push(
      consumer('video.uploaded', async (message) => {
        const payload = JSON.parse(message.content.toString()) as { videoId: string };
        await this.options.analyze.execute({ videoId: payload.videoId });
      }),
      consumer('video.analyzed', async (message) => {
        const payload = JSON.parse(message.content.toString()) as { videoId: string };
        await this.options.planChunks.execute({ videoId: payload.videoId });
      }),
      consumer('video.chunk.process', async (message) => {
        const payload = JSON.parse(message.content.toString()) as ProcessChunkInput;
        await this.options.processChunk.execute(payload);
      }),
      consumer('video.chunk.completed', async (message) => {
        const payload = JSON.parse(message.content.toString()) as { videoId: string };
        await this.options.aggregate.execute({ videoId: payload.videoId });
      }),
      consumer('video.chunk.failed', async (message) => {
        const payload = JSON.parse(message.content.toString()) as { videoId: string };
        await this.options.aggregate.execute({ videoId: payload.videoId });
      }),
      consumer('video.chunks.all', async (message) => {
        const payload = JSON.parse(message.content.toString()) as { videoId: string };
        await this.options.packageArchive.execute({ videoId: payload.videoId });
      }),
      consumer('video.completed', async (message) => {
        const payload = JSON.parse(message.content.toString()) as {
          videoId: string;
          ownerId: string;
        };
        if (this.options.notifyCompletion !== undefined) {
          await this.options.notifyCompletion.execute(payload);
        }
      }),
      consumer('video.failed', async (message) => {
        const payload = JSON.parse(message.content.toString()) as {
          videoId: string;
          ownerId: string;
          reason: string;
        };
        if (this.options.notifyFailure !== undefined) {
          await this.options.notifyFailure.execute({
            videoId: payload.videoId,
            ownerId: payload.ownerId,
            reason: payload.reason,
          });
        }
      }),
    );

    for (const item of this.consumers) {
      await item.start();
    }
  }

  public async stop(): Promise<void> {
    for (const item of this.consumers) {
      await item.stop();
    }
  }
}
