import { NotificationGateway } from './ports/notification-gateway';
import { UserEmailResolver } from './ports/user-email-resolver';

export interface NotifyProcessingCompletionInput {
  videoId: string;
  ownerId: string;
}

export class NotifyProcessingCompletionUseCase {
  public constructor(
    private readonly notificationGateway: NotificationGateway,
    private readonly userEmailResolver: UserEmailResolver,
  ) {}

  public async execute(input: NotifyProcessingCompletionInput): Promise<void> {
    const email = await this.userEmailResolver.resolve(input.ownerId);

    await this.notificationGateway.send({
      to: email,
      subject: `Video processing completed: ${input.videoId}`,
      body: 'Your video is ready to download in FIAP X.',
    });
  }
}
