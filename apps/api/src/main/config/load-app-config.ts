export type NodeEnvironment = 'development' | 'test' | 'production';

export type AppConfig = Readonly<{
  databasePoolMax: number;
  databaseUrl: string;
  firebaseAuthEmulatorHost: string | null;
  firebaseProjectId: string;
  nodeEnv: NodeEnvironment;
  objectStorageAccessKey: string;
  objectStorageBucket: string;
  objectStorageEndpoint: string;
  objectStoragePublicEndpoint: string;
  objectStorageSecretKey: string;
  outboxBatchSize: number;
  outboxIntervalMs: number;
  port: number;
  rabbitmqUrl: string;
  videoUploadMaxBytes: number;
  videoUploadTtlSeconds: number;
}>;

type ExternalEnvironment = Readonly<Record<string, string | undefined>>;
type RequiredProductionKey =
  | 'DATABASE_URL'
  | 'FIREBASE_PROJECT_ID'
  | 'OBJECT_STORAGE_ACCESS_KEY'
  | 'OBJECT_STORAGE_ENDPOINT'
  | 'OBJECT_STORAGE_PUBLIC_ENDPOINT'
  | 'OBJECT_STORAGE_SECRET_KEY'
  | 'RABBITMQ_URL';

const DEFAULT_DATABASE_URL = 'postgresql://fiapx:fiapx@127.0.0.1:5432/fiapx';
const MAX_PORT = 65_535;

function parseNodeEnvironment(value: string | undefined): NodeEnvironment {
  const nodeEnvironment = value ?? 'development';
  if (!['development', 'test', 'production'].includes(nodeEnvironment)) {
    throw new Error('NODE_ENV must be development, test, or production');
  }
  return nodeEnvironment as NodeEnvironment;
}

function parseInteger(
  value: string | undefined,
  fallback: number,
  name: string,
  minimum = 1,
  maximum = Number.MAX_SAFE_INTEGER,
): number {
  const parsed = value === undefined ? fallback : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(
      `${name} must be an integer between ${String(minimum)} and ${String(maximum)}`,
    );
  }
  return parsed;
}

function parseRequiredString(
  value: string | undefined,
  fallback: string,
  name: string,
): string {
  const parsed = value?.trim() ?? fallback;
  if (parsed.length === 0)
    throw new Error(`${name} must be a non-empty string`);
  return parsed;
}

function parseUrl(
  value: string | undefined,
  fallback: string,
  name: string,
): string {
  const parsed = parseRequiredString(value, fallback, name);
  try {
    const url = new URL(parsed);
    if (!['http:', 'https:', 'amqp:', 'amqps:'].includes(url.protocol))
      throw new Error();
    return parsed;
  } catch {
    throw new Error(`${name} must be a valid URL`);
  }
}

export function loadAppConfig(environment: ExternalEnvironment): AppConfig {
  const nodeEnv = parseNodeEnvironment(environment.NODE_ENV);
  const emulatorHost = environment.FIREBASE_AUTH_EMULATOR_HOST?.trim();
  let firebaseAuthEmulatorHost: string | null = emulatorHost ?? null;
  if (firebaseAuthEmulatorHost === '') firebaseAuthEmulatorHost = null;
  if (nodeEnv === 'production' && firebaseAuthEmulatorHost !== null) {
    throw new Error(
      'FIREBASE_AUTH_EMULATOR_HOST must not be configured in production',
    );
  }
  const productionKeys: readonly RequiredProductionKey[] = [
    'DATABASE_URL',
    'FIREBASE_PROJECT_ID',
    'OBJECT_STORAGE_ACCESS_KEY',
    'OBJECT_STORAGE_ENDPOINT',
    'OBJECT_STORAGE_PUBLIC_ENDPOINT',
    'OBJECT_STORAGE_SECRET_KEY',
    'RABBITMQ_URL',
  ];
  if (nodeEnv === 'production') {
    for (const key of productionKeys) {
      const value = environment[key];
      if (value === undefined || value.trim().length === 0) {
        throw new Error(`${key} is required in production`);
      }
    }
  }

  return {
    databasePoolMax: parseInteger(
      environment.DATABASE_POOL_MAX,
      10,
      'DATABASE_POOL_MAX',
    ),
    databaseUrl: parseRequiredString(
      environment.DATABASE_URL,
      DEFAULT_DATABASE_URL,
      'DATABASE_URL',
    ),
    firebaseAuthEmulatorHost,
    firebaseProjectId: parseRequiredString(
      environment.FIREBASE_PROJECT_ID,
      'demo-fiapx',
      'FIREBASE_PROJECT_ID',
    ),
    nodeEnv,
    objectStorageAccessKey: parseRequiredString(
      environment.OBJECT_STORAGE_ACCESS_KEY,
      'fiapx',
      'OBJECT_STORAGE_ACCESS_KEY',
    ),
    objectStorageBucket: parseRequiredString(
      environment.OBJECT_STORAGE_BUCKET,
      'fiapx-videos',
      'OBJECT_STORAGE_BUCKET',
    ),
    objectStorageEndpoint: parseUrl(
      environment.OBJECT_STORAGE_ENDPOINT,
      'http://127.0.0.1:9000',
      'OBJECT_STORAGE_ENDPOINT',
    ),
    objectStoragePublicEndpoint: parseUrl(
      environment.OBJECT_STORAGE_PUBLIC_ENDPOINT,
      'http://127.0.0.1:9000',
      'OBJECT_STORAGE_PUBLIC_ENDPOINT',
    ),
    objectStorageSecretKey: parseRequiredString(
      environment.OBJECT_STORAGE_SECRET_KEY,
      'fiapx-local-secret',
      'OBJECT_STORAGE_SECRET_KEY',
    ),
    outboxBatchSize: parseInteger(
      environment.OUTBOX_BATCH_SIZE,
      20,
      'OUTBOX_BATCH_SIZE',
    ),
    outboxIntervalMs: parseInteger(
      environment.OUTBOX_INTERVAL_MS,
      1_000,
      'OUTBOX_INTERVAL_MS',
    ),
    port: parseInteger(environment.APP_PORT, 3000, 'APP_PORT', 1, MAX_PORT),
    rabbitmqUrl: parseUrl(
      environment.RABBITMQ_URL,
      'amqp://fiapx:fiapx@127.0.0.1:5672',
      'RABBITMQ_URL',
    ),
    videoUploadMaxBytes: parseInteger(
      environment.VIDEO_UPLOAD_MAX_BYTES,
      2_147_483_648,
      'VIDEO_UPLOAD_MAX_BYTES',
    ),
    videoUploadTtlSeconds: parseInteger(
      environment.VIDEO_UPLOAD_TTL_SECONDS,
      900,
      'VIDEO_UPLOAD_TTL_SECONDS',
      300,
      3_600,
    ),
  };
}
