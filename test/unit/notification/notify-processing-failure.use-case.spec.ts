import { NotifyProcessingFailureUseCase } from '../../../src/contexts/notification/application/notify-processing-failure.use-case';
import {
  EmailNotification,
  NotificationGateway,
} from '../../../src/contexts/notification/application/ports/notification-gateway';
import { UserEmailResolver } from '../../../src/contexts/notification/application/ports/user-email-resolver';

class FakeNotificationGateway implements NotificationGateway {
  public readonly sent: EmailNotification[] = [];

  public send(notification: EmailNotification): Promise<void> {
    this.sent.push(notification);
    return Promise.resolve();
  }
}

class FakeUserEmailResolver implements UserEmailResolver {
  public resolve(userId: string): Promise<string> {
    return Promise.resolve(`${userId}@example.com`);
  }
}

describe('NotifyProcessingFailureUseCase', () => {
  it('resolves the owner email and sends the notification', async () => {
    const gateway = new FakeNotificationGateway();
    const useCase = new NotifyProcessingFailureUseCase(gateway, new FakeUserEmailResolver());

    await useCase.execute({
      videoId: 'video-1',
      ownerId: 'user-1',
      reason: 'Chunk 0 failed',
    });

    expect(gateway.sent).toEqual([
      {
        to: 'user-1@example.com',
        subject: 'Video processing failed: video-1',
        body: 'Chunk 0 failed',
      },
    ]);
  });
});
