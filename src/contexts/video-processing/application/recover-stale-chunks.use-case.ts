import { ChunkRecoveryRepository } from './ports/chunk-recovery-repository';
import { MessagePublisher } from './ports/message-publisher';

const STALE_AFTER_MS = 5 * 60_000;

export class RecoverStaleChunksUseCase {
  public constructor(
    private readonly repository: ChunkRecoveryRepository,
    private readonly publisher: MessagePublisher,
  ) {}

  public async execute(now = new Date()): Promise<number> {
    const stale = await this.repository.reserveStale(new Date(now.getTime() - STALE_AFTER_MS), 100);

    for (const chunk of stale) {
      await this.publisher.publishProcessVideoChunk(chunk);
    }

    return stale.length;
  }
}
