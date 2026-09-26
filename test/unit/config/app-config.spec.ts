import { loadAppConfig, parseAppConfig } from '../../../src/platform/config/app-config.schema';

const requiredEnv: NodeJS.ProcessEnv = {
  DATABASE_URL: 'postgres://fiapx:fiapx@localhost:5432/fiapx',
  RABBITMQ_URL: 'amqp://fiapx:fiapx@localhost:5672',
  REDIS_URL: 'redis://localhost:6379',
  S3_ENDPOINT: 'http://localhost:9000',
  S3_ACCESS_KEY: 'minioadmin',
  S3_SECRET_KEY: 'minioadmin',
  S3_BUCKET: 'fiapx',
  JWT_SECRET: 'change-me',
};

describe('parseAppConfig', () => {
  it('applies defaults when only required variables are present', () => {
    const config = parseAppConfig(requiredEnv);

    expect(config.nodeEnv).toBe('development');
    expect(config.port).toBe(3000);
    expect(config.processing.chunkSeconds).toBe(10);
    expect(config.processing.maxChunks).toBe(100);
    expect(config.s3.region).toBe('us-east-1');
    expect(config.jwt.expiresIn).toBe('15m');
    expect(config.smtp.host).toBe('localhost');
    expect(config.smtp.port).toBe(1025);
  });

  it('parses and maps every provided variable', () => {
    const config = parseAppConfig({
      ...requiredEnv,
      NODE_ENV: 'production',
      PORT: '8080',
      S3_REGION: 'sa-east-1',
      JWT_EXPIRES_IN: '1h',
      CHUNK_SECONDS: '30',
      MAX_CHUNKS: '50',
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: '2525',
    });

    expect(config.nodeEnv).toBe('production');
    expect(config.port).toBe(8080);
    expect(config.s3.region).toBe('sa-east-1');
    expect(config.jwt.expiresIn).toBe('1h');
    expect(config.processing.chunkSeconds).toBe(30);
    expect(config.processing.maxChunks).toBe(50);
    expect(config.smtp.host).toBe('smtp.example.com');
    expect(config.smtp.port).toBe(2525);
  });

  it('rejects when a required variable is missing', () => {
    const withoutDatabaseUrl: NodeJS.ProcessEnv = { ...requiredEnv };
    delete withoutDatabaseUrl.DATABASE_URL;

    expect(() => parseAppConfig(withoutDatabaseUrl)).toThrow(/DATABASE_URL/);
  });

  it('rejects when a required variable is empty', () => {
    expect(() => parseAppConfig({ ...requiredEnv, JWT_SECRET: '' })).toThrow(/JWT_SECRET/);
  });

  it('rejects non-numeric values for numeric variables', () => {
    expect(() => parseAppConfig({ ...requiredEnv, PORT: 'abc' })).toThrow(/PORT/);
    expect(() => parseAppConfig({ ...requiredEnv, CHUNK_SECONDS: '0' })).toThrow(/CHUNK_SECONDS/);
  });

  it('rejects unsupported node environments', () => {
    expect(() => parseAppConfig({ ...requiredEnv, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });

  it('loadAppConfig delegates to parseAppConfig with an explicit env', () => {
    const config = loadAppConfig({ ...requiredEnv, PORT: '7000' });

    expect(config.port).toBe(7000);
  });
});
