import { InvalidPaginationError } from './errors';
import { PaginatedVideos, VideoRepository } from './ports/video-repository';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export interface ListUserVideosInput {
  ownerId: string;
  page?: number;
  pageSize?: number;
}

export class ListUserVideosUseCase {
  public constructor(private readonly videoRepository: VideoRepository) {}

  public async execute(input: ListUserVideosInput): Promise<PaginatedVideos> {
    const page = input.page ?? DEFAULT_PAGE;
    const pageSize = input.pageSize ?? DEFAULT_PAGE_SIZE;

    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > MAX_PAGE_SIZE
    ) {
      throw new InvalidPaginationError();
    }

    return this.videoRepository.findByOwnerId(input.ownerId, page, pageSize);
  }
}
