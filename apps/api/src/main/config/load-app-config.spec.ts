import { loadAppConfig } from './load-app-config.js';

describe('loadAppConfig', () => {
  it('uses safe defaults when optional values are absent', () => {
    expect(loadAppConfig({})).toEqual({
      nodeEnv: 'development',
      port: 3000,
    });
  });

  it('parses valid external values', () => {
    expect(
      loadAppConfig({
        APP_PORT: '8080',
        NODE_ENV: 'production',
      }),
    ).toEqual({
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
});
