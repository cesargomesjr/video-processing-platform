import { ConsumeMessage } from 'amqplib';

import { AggregateChunksUseCase } from '../contexts/video-processing/application/aggregate-chunks.use-case';
import { AnalyzeVideoUseCase } from '../contexts/video-processing/application/analyze-video.use-case';
import { NotifyProcessingFailureUseCase } from '../contexts/notification/application/notify-processing-failure.use-case';
import { PackageArchiveUseCase } from '../contexts/video-processing/application/package-archive.use-case';
import { PlanChunksUseCase } from '../contexts/video-processing/application/plan-chunks.use-case';
import {
  ProcessChunkInput,
  ProcessChunkUseCase,
} from '../contexts/video-processing/application/process-chunk.use-case';
import { RabbitMqConsumer } from '../contexts/video-processing/infrastructure/rabbitmq-consumer';

const EXCHANGE = 'video.events';

interface VideoProcessingPipelineOptions {
  url: string;
  analyze: AnalyzeVideoUseCase;
  planChunks: PlanChunksUseCase;
  processChunk: ProcessChunkUseCase;
  aggregate: AggregateChunksUseCase;
  packageArchive: PackageArchiveUseCase;
  notifyFailure?: NotifyProcessingFailureUseCase;
}

export class VideoProcessingPipeline {
  private readonly consumers: RabbitMqConsumer[] = [];

  public constructor(private readonly options: VideoProcessingPipelineOptions) {}

  public async start(): Promise<void> {
    const consumer = (
      queue: string,
      routingKey: string,
      handler: (message: ConsumeMessage) => Promise<void>,
    ): RabbitMqConsumer =>
      new RabbitMqConsumer({
        url: this.options.url,
        exchange: EXCHANGE,
        queue,
        routingKey,
        maxRetries: 3,
        baseBackoffMs: 100,
        handler,
      });

    this.consumers.push(
      consumer('video.uploaded.analyzer', 'video.uploaded', async (message) => {
        const payload = JSON.parse(message.content.toString()) as { videoId: string };
        await this.options.analyze.execute({ videoId: payload.videoId });
      }),
      consumer('video.analyzed.orchestrator', 'video.analyzed', async (message) => {
        const payload = JSON.parse(message.content.toString()) as { videoId: string };
        await this.options.planChunks.execute({ videoId: payload.videoId });
      }),
      consumer('video.chunk.process.worker', 'video.chunk.process', async (message) => {
        const payload = JSON.parse(message.content.toString()) as ProcessChunkInput;
        await this.options.processChunk.execute(payload);
      }),
      consumer('video.chunk.completed.aggregator', 'video.chunk.completed', async (message) => {
        const payload = JSON.parse(message.content.toString()) as { videoId: string };
        await this.options.aggregate.execute({ videoId: payload.videoId });
      }),
      consumer('video.chunks.all.packager', 'video.chunks.all', async (message) => {
        const payload = JSON.parse(message.content.toString()) as { videoId: string };
        await this.options.packageArchive.execute({ videoId: payload.videoId });
      }),
      consumer('video.failed.notification', 'video.failed', async (message) => {
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
