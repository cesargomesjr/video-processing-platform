import type {
  IntegrationEventPublisher,
  OutboxRepository,
} from '../ports/video-ports.js';

export class DispatchPendingIntegrationEvents {
  public constructor(
    private readonly outboxRepository: OutboxRepository,
    private readonly publisher: IntegrationEventPublisher,
    private readonly clock: () => Date = () => new Date(),
    private readonly random: () => number = Math.random,
  ) {}

  public async execute(batchSize: number): Promise<number> {
    const now = this.clock();
    const messages = await this.outboxRepository.claim(
      batchSize,
      new Date(now.getTime() + 30_000),
    );

    for (const message of messages) {
      try {
        await this.publisher.publish(message);
        await this.outboxRepository.markPublished(message.id, this.clock());
      } catch (error: unknown) {
        const messageText =
          error instanceof Error ? error.name : 'UnknownError';
        const baseDelayMs = Math.min(
          250_000,
          5_000 * 2 ** Math.min(message.attempts, 6),
        );
        const jitterMs = Math.floor(baseDelayMs * 0.2 * this.random());
        await this.outboxRepository.scheduleRetry(
          message.id,
          new Date(this.clock().getTime() + baseDelayMs + jitterMs),
          messageText,
        );
      }
    }

    return messages.length;
  }
}
