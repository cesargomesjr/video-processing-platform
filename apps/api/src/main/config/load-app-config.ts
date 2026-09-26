export type NodeEnvironment = 'development' | 'test' | 'production';

export type AppConfig = Readonly<{
  databasePoolMax: number;
  databaseUrl: string;
  firebaseAuthEmulatorHost: string | null;
  firebaseProjectId: string;
  nodeEnv: NodeEnvironment;
  port: number;
}>;

type ExternalEnvironment = Readonly<Record<string, string | undefined>>;

const DEFAULT_DATABASE_POOL_MAX = 10;
const DEFAULT_DATABASE_URL = 'postgresql://fiapx:fiapx@127.0.0.1:5432/fiapx';
const DEFAULT_FIREBASE_PROJECT_ID = 'demo-fiapx';
const DEFAULT_PORT = 3000;
const MIN_PORT = 1;
const MAX_PORT = 65_535;

function requiredProductionValue(
  environment: ExternalEnvironment,
  key: 'DATABASE_URL' | 'FIREBASE_PROJECT_ID',
): string | undefined {
  return environment.NODE_ENV === 'production' ? environment[key] : undefined;
}

function parseNodeEnvironment(value: string | undefined): NodeEnvironment {
  const nodeEnvironment = value ?? 'development';

  if (
    nodeEnvironment !== 'development' &&
    nodeEnvironment !== 'test' &&
    nodeEnvironment !== 'production'
  ) {
    throw new Error('NODE_ENV must be development, test, or production');
  }

  return nodeEnvironment;
}

function parsePort(value: string | undefined): number {
  if (value === undefined) {
    return DEFAULT_PORT;
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port < MIN_PORT || port > MAX_PORT) {
    throw new Error('APP_PORT must be an integer between 1 and 65535');
  }

  return port;
}

function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
  name: string,
): number {
  if (value === undefined) {
    return fallback;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return parsedValue;
}

function parseRequiredString(
  value: string | undefined,
  fallback: string,
  name: string,
): string {
  const parsedValue = value?.trim() ?? fallback;

  if (parsedValue.length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }

  return parsedValue;
}

export function loadAppConfig(environment: ExternalEnvironment): AppConfig {
  const nodeEnv = parseNodeEnvironment(environment.NODE_ENV);
  const emulatorHost = environment.FIREBASE_AUTH_EMULATOR_HOST?.trim();
  const firebaseAuthEmulatorHost =
    emulatorHost === undefined || emulatorHost.length === 0
      ? null
      : emulatorHost;

  if (nodeEnv === 'production' && firebaseAuthEmulatorHost !== null) {
    throw new Error(
      'FIREBASE_AUTH_EMULATOR_HOST must not be configured in production',
    );
  }

  const requiredDatabaseUrl = requiredProductionValue(
    environment,
    'DATABASE_URL',
  );
  const requiredFirebaseProjectId = requiredProductionValue(
    environment,
    'FIREBASE_PROJECT_ID',
  );

  if (nodeEnv === 'production' && requiredDatabaseUrl === undefined) {
    throw new Error('DATABASE_URL is required in production');
  }

  if (nodeEnv === 'production' && requiredFirebaseProjectId === undefined) {
    throw new Error('FIREBASE_PROJECT_ID is required in production');
  }

  return {
    databasePoolMax: parsePositiveInteger(
      environment.DATABASE_POOL_MAX,
      DEFAULT_DATABASE_POOL_MAX,
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
      DEFAULT_FIREBASE_PROJECT_ID,
      'FIREBASE_PROJECT_ID',
    ),
    nodeEnv,
    port: parsePort(environment.APP_PORT),
  };
}
