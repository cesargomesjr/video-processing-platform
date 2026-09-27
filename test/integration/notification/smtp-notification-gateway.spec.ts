import { get } from 'node:http';

import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';

import { SmtpNotificationGateway } from '../../../src/contexts/notification/infrastructure/smtp-notification-gateway';

interface MailHogResponse {
  items: MailHogMessage[];
}

interface MailHogMessage {
  Content: {
    Headers: {
      Subject?: string[];
      To?: string[];
    };
  };
}

function getJson<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    get(url, (response) => {
      let body = '';
      response.on('data', (chunk: Buffer) => {
        body += chunk.toString();
      });
      response.on('end', () => {
        try {
          resolve(JSON.parse(body) as T);
        } catch (error: unknown) {
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      });
    }).on('error', reject);
  });
}

async function waitFor<T>(predicate: () => Promise<T | undefined>, timeoutMs: number): Promise<T> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const value = await predicate();
    if (value !== undefined) {
      return value;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error('Timed out waiting for condition');
}

describe('SmtpNotificationGateway', () => {
  let container: StartedTestContainer;
  let gateway: SmtpNotificationGateway;
  let apiUrl: string;

  beforeAll(async () => {
    container = await new GenericContainer('mailhog/mailhog')
      .withExposedPorts(1025, 8025)
      .withWaitStrategy(Wait.forHttp('/api/v2/messages', 8025))
      .start();

    gateway = new SmtpNotificationGateway({
      host: container.getHost(),
      port: container.getMappedPort(1025),
      from: 'no-reply@fiapx.com',
    });
    apiUrl = `http://${container.getHost()}:${container.getMappedPort(8025)}/api/v2/messages`;
  }, 120_000);

  afterAll(async () => {
    if (container !== undefined) {
      await container.stop();
    }
  });

  it('delivers an email to mailhog', async () => {
    await gateway.send({
      to: 'user@example.com',
      subject: 'Video processing failed: video-1',
      body: 'Chunk 0 failed',
    });

    const message = await waitFor<MailHogMessage>(async () => {
      const response = await getJson<MailHogResponse>(apiUrl);
      return response.items.find((item) =>
        item.Content.Headers.Subject?.includes('Video processing failed: video-1'),
      );
    }, 10_000);

    expect(message.Content.Headers.To).toContain('user@example.com');
    expect(message.Content.Headers.Subject).toContain('Video processing failed: video-1');
  });
});
