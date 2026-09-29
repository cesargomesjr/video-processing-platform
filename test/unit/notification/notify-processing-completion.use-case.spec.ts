import { NotifyProcessingCompletionUseCase } from '../../../src/contexts/notification/application/notify-processing-completion.use-case';
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

describe('NotifyProcessingCompletionUseCase', () => {
  it('sends a completion email to the registered owner', async () => {
    const gateway = new FakeNotificationGateway();
    const useCase = new NotifyProcessingCompletionUseCase(gateway, new FakeUserEmailResolver());

    await useCase.execute({ videoId: 'video-1', ownerId: 'user-1' });

    expect(gateway.sent).toEqual([
      {
        to: 'user-1@example.com',
        subject: 'Video processing completed: video-1',
        body: 'Your video is ready to download in FIAP X.',
      },
    ]);
  });
});
