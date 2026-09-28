import { RecoverStaleChunksUseCase } from '../../../src/contexts/video-processing/application/recover-stale-chunks.use-case';
import { ChunkRecoveryRepository } from '../../../src/contexts/video-processing/application/ports/chunk-recovery-repository';
import {
  MessagePublisher,
  ProcessVideoChunkEvent,
} from '../../../src/contexts/video-processing/application/ports/message-publisher';

describe('RecoverStaleChunksUseCase', () => {
  it('publishes reserved work with a five-minute staleness window', async () => {
    const event: ProcessVideoChunkEvent = {
      videoId: 'video-1',
      chunkIndex: 2,
      startSeconds: 20,
      durationSeconds: 10,
      storageKey: 'original/video-1.mp4',
    };
    const reserveStale = jest.fn().mockResolvedValue([event]);
    const publishProcessVideoChunk = jest.fn().mockResolvedValue(undefined);
    const repository = { reserveStale } as ChunkRecoveryRepository;
    const publisher = { publishProcessVideoChunk } as unknown as MessagePublisher;
    const useCase = new RecoverStaleChunksUseCase(repository, publisher);
    const now = new Date('2026-09-28T02:00:00Z');

    await expect(useCase.execute(now)).resolves.toBe(1);
    expect(reserveStale).toHaveBeenCalledWith(new Date('2026-09-28T01:55:00Z'), 100);
    expect(publishProcessVideoChunk).toHaveBeenCalledWith(event);
  });
});
