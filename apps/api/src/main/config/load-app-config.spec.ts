import { loadAppConfig } from './load-app-config.js';

describe('loadAppConfig', () => {
  it('uses safe defaults when optional values are absent', () => {
    expect(loadAppConfig({})).toEqual({
      databasePoolMax: 10,
      databaseUrl: 'postgresql://fiapx:fiapx@127.0.0.1:5432/fiapx',
      firebaseAuthEmulatorHost: null,
      firebaseProjectId: 'demo-fiapx',
      nodeEnv: 'development',
      port: 3000,
    });
  });

  it('parses valid external values', () => {
    expect(
      loadAppConfig({
        APP_PORT: '8080',
        DATABASE_POOL_MAX: '5',
        DATABASE_URL: 'postgresql://database/app',
        FIREBASE_PROJECT_ID: 'fiapx-test',
        NODE_ENV: 'production',
      }),
    ).toEqual({
      databasePoolMax: 5,
      databaseUrl: 'postgresql://database/app',
      firebaseAuthEmulatorHost: null,
      firebaseProjectId: 'fiapx-test',
      nodeEnv: 'production',
      port: 8080,
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

  it('rejects an invalid pool size', () => {
    expect(() => loadAppConfig({ DATABASE_POOL_MAX: '0' })).toThrow(
      'DATABASE_POOL_MAX must be a positive integer',
    );
  });

  it.each(['DATABASE_URL', 'FIREBASE_PROJECT_ID'] as const)(
    'requires %s in production',
    (key) => {
      const environment = {
        DATABASE_URL: 'postgresql://database/app',
        FIREBASE_PROJECT_ID: 'fiapx-production',
        NODE_ENV: 'production',
      };

      expect(() => loadAppConfig({ ...environment, [key]: undefined })).toThrow(
        `${key} is required in production`,
      );
    },
  );

  it('rejects the Firebase emulator in production', () => {
    expect(() =>
      loadAppConfig({
        DATABASE_URL: 'postgresql://database/app',
        FIREBASE_AUTH_EMULATOR_HOST: 'firebase:9099',
        FIREBASE_PROJECT_ID: 'fiapx-production',
        NODE_ENV: 'production',
      }),
    ).toThrow(
      'FIREBASE_AUTH_EMULATOR_HOST must not be configured in production',
    );
  });
});
