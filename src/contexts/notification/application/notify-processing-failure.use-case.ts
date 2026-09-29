import { NotificationGateway } from './ports/notification-gateway';
import { UserEmailResolver } from './ports/user-email-resolver';

export interface NotifyProcessingFailureInput {
  videoId: string;
  ownerId: string;
  reason: string;
}

export class NotifyProcessingFailureUseCase {
  public constructor(
    private readonly notificationGateway: NotificationGateway,
    private readonly userEmailResolver: UserEmailResolver,
  ) {}

  public async execute(input: NotifyProcessingFailureInput): Promise<void> {
    const email = await this.userEmailResolver.resolve(input.ownerId);

    await this.notificationGateway.send({
      to: email,
      subject: `Video processing failed: ${input.videoId}`,
      body: input.reason,
    });
  }
}
