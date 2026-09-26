export type NodeEnvironment = 'development' | 'test' | 'production';

export type AppConfig = Readonly<{
  nodeEnv: NodeEnvironment;
  port: number;
}>;

type ExternalEnvironment = Readonly<Record<string, string | undefined>>;

const DEFAULT_PORT = 3000;
const MIN_PORT = 1;
const MAX_PORT = 65_535;

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

export function loadAppConfig(environment: ExternalEnvironment): AppConfig {
  return {
    nodeEnv: parseNodeEnvironment(environment.NODE_ENV),
    port: parsePort(environment.APP_PORT),
  };
}
