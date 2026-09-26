import { loadAppConfig } from './load-app-config.js';

const PRODUCTION_ENVIRONMENT = {
  DATABASE_URL: 'postgresql://database/app',
  FIREBASE_PROJECT_ID: 'fiapx-production',
  OBJECT_STORAGE_ACCESS_KEY: 'access',
  OBJECT_STORAGE_ENDPOINT: 'https://storage.internal',
  OBJECT_STORAGE_PUBLIC_ENDPOINT: 'https://storage.example.com',
  OBJECT_STORAGE_SECRET_KEY: 'secret',
  RABBITMQ_URL: 'amqps://rabbit.example.com',
  NODE_ENV: 'production',
} as const;

describe('loadAppConfig', () => {
  it('uses safe local defaults when optional values are absent', () => {
    expect(loadAppConfig({})).toMatchObject({
      databasePoolMax: 10,
      firebaseAuthEmulatorHost: null,
      firebaseProjectId: 'demo-fiapx',
      nodeEnv: 'development',
      objectStorageBucket: 'fiapx-videos',
      objectStorageEndpoint: 'http://127.0.0.1:9000',
      outboxBatchSize: 20,
      port: 3000,
      rabbitmqUrl: 'amqp://fiapx:fiapx@127.0.0.1:5672',
      videoUploadMaxBytes: 2_147_483_648,
      videoUploadTtlSeconds: 900,
    });
  });

  it('parses production configuration', () => {
    expect(
      loadAppConfig({ ...PRODUCTION_ENVIRONMENT, APP_PORT: '8080' }),
    ).toMatchObject({
      nodeEnv: 'production',
      port: 8080,
      objectStorageEndpoint: 'https://storage.internal',
      objectStoragePublicEndpoint: 'https://storage.example.com',
    });
  });

  it.each(['0', '65536', '3.14', 'not-a-number'])(
    'rejects invalid APP_PORT %s',
    (port) => {
      expect(() => loadAppConfig({ APP_PORT: port })).toThrow(
        'APP_PORT must be an integer between 1 and 65535',
      );
    },
  );

  it('rejects an unsupported NODE_ENV', () => {
    expect(() => loadAppConfig({ NODE_ENV: 'staging' })).toThrow(
      'NODE_ENV must be development, test, or production',
    );
  });

  it.each([
    'DATABASE_URL',
    'FIREBASE_PROJECT_ID',
    'OBJECT_STORAGE_SECRET_KEY',
    'RABBITMQ_URL',
  ] as const)('requires %s in production', (key) => {
    expect(() =>
      loadAppConfig({ ...PRODUCTION_ENVIRONMENT, [key]: undefined }),
    ).toThrow(`${key} is required in production`);
  });

  it('rejects invalid upload TTL and endpoint', () => {
    expect(() => loadAppConfig({ VIDEO_UPLOAD_TTL_SECONDS: '60' })).toThrow(
      'VIDEO_UPLOAD_TTL_SECONDS must be an integer between 300 and 3600',
    );
    expect(() => loadAppConfig({ OBJECT_STORAGE_ENDPOINT: 'not-url' })).toThrow(
      'OBJECT_STORAGE_ENDPOINT must be a valid URL',
    );
  });

  it('rejects the Firebase emulator in production', () => {
    expect(() =>
      loadAppConfig({
        ...PRODUCTION_ENVIRONMENT,
        FIREBASE_AUTH_EMULATOR_HOST: 'firebase:9099',
      }),
    ).toThrow(
      'FIREBASE_AUTH_EMULATOR_HOST must not be configured in production',
    );
  });
});
