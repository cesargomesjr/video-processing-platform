import { z } from 'zod';

const nonEmptyString = (name: string): z.ZodString =>
  z.string().min(1, `${name} não pode ser vazia`);

const positiveInteger = (name: string): z.ZodNumber =>
  z.coerce.number().int(`${name} deve ser um número inteiro`).positive(`${name} deve ser positivo`);

const rawEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: positiveInteger('PORT').default(3000),
  DATABASE_URL: nonEmptyString('DATABASE_URL'),
  RABBITMQ_URL: nonEmptyString('RABBITMQ_URL'),
  REDIS_URL: nonEmptyString('REDIS_URL'),
  S3_ENDPOINT: nonEmptyString('S3_ENDPOINT'),
  S3_ACCESS_KEY: nonEmptyString('S3_ACCESS_KEY'),
  S3_SECRET_KEY: nonEmptyString('S3_SECRET_KEY'),
  S3_BUCKET: nonEmptyString('S3_BUCKET'),
  S3_REGION: nonEmptyString('S3_REGION').default('us-east-1'),
  JWT_SECRET: nonEmptyString('JWT_SECRET'),
  JWT_EXPIRES_IN: nonEmptyString('JWT_EXPIRES_IN').default('15m'),
  CHUNK_SECONDS: positiveInteger('CHUNK_SECONDS').default(10),
  MAX_CHUNKS: positiveInteger('MAX_CHUNKS').default(100),
  SMTP_HOST: nonEmptyString('SMTP_HOST').default('localhost'),
  SMTP_PORT: positiveInteger('SMTP_PORT').default(1025),
});

const appConfigSchema = rawEnvSchema.transform((raw) => ({
  nodeEnv: raw.NODE_ENV,
  port: raw.PORT,
  databaseUrl: raw.DATABASE_URL,
  rabbitmqUrl: raw.RABBITMQ_URL,
  redisUrl: raw.REDIS_URL,
  s3: {
    endpoint: raw.S3_ENDPOINT,
    accessKey: raw.S3_ACCESS_KEY,
    secretKey: raw.S3_SECRET_KEY,
    bucket: raw.S3_BUCKET,
    region: raw.S3_REGION,
  },
  jwt: {
    secret: raw.JWT_SECRET,
    expiresIn: raw.JWT_EXPIRES_IN,
  },
  processing: {
    chunkSeconds: raw.CHUNK_SECONDS,
    maxChunks: raw.MAX_CHUNKS,
  },
  smtp: {
    host: raw.SMTP_HOST,
    port: raw.SMTP_PORT,
  },
}));

export type AppConfig = z.infer<typeof appConfigSchema>;

export function parseAppConfig(env: NodeJS.ProcessEnv): AppConfig {
  const result = appConfigSchema.safeParse(env);

  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => {
        const path = issue.path.join('.');
        return path.length > 0 ? path : issue.message;
      })
      .join(', ');

    throw new Error(`Configuração de ambiente inválida: ${problems}`);
  }

  return result.data;
}

export function loadAppConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return parseAppConfig(env);
}
