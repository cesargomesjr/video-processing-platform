import {
  getCorrelationId,
  runWithCorrelationId,
} from '../../../src/platform/logger/correlation-context';
import { PinoLogger } from '../../../src/platform/logger/pino.logger';

interface CapturingStream {
  lines: string[];
  stream: {
    write(chunk: string): void;
  };
}

function createCapturingStream(): CapturingStream {
  const lines: string[] = [];
  return {
    lines,
    stream: {
      write(chunk: string): void {
        lines.push(chunk);
      },
    },
  };
}

function parseLogLine<T>(line: string): T {
  return JSON.parse(line) as T;
}

describe('PinoLogger', () => {
  it('attaches the correlation id from the async context', () => {
    const { lines, stream } = createCapturingStream();
    const logger = new PinoLogger({ stream });

    runWithCorrelationId('corr-42', () => {
      logger.info({ method: 'GET' }, 'hello');
    });

    const entry = parseLogLine<Record<string, unknown>>(lines[0]!);
    expect(entry.correlationId).toBe('corr-42');
    expect(entry.msg).toBe('hello');
    expect(entry.method).toBe('GET');
    expect(getCorrelationId()).toBeUndefined();
  });

  it('redacts sensitive fields', () => {
    const { lines, stream } = createCapturingStream();
    const logger = new PinoLogger({ stream });

    logger.info({ password: 'secret-pass', secretKey: 'secret-key' }, 'sensitive');

    const raw = lines.join('');
    const entry = parseLogLine<Record<string, unknown>>(lines[0]!);
    expect(entry.password).toBe('[REDACTED]');
    expect(entry.secretKey).toBe('[REDACTED]');
    expect(raw).not.toContain('secret-pass');
    expect(raw).not.toContain('secret-key');
  });

  it('implements the Nest LoggerService methods', () => {
    const { lines, stream } = createCapturingStream();
    const logger = new PinoLogger({ stream, level: 'trace' });

    logger.log('log message', 'ContextName');
    logger.error('error message');
    logger.warn('warn message');
    logger.debug('debug message');
    logger.verbose('verbose message');
    logger.fatal('fatal message');

    expect(lines.length).toBeGreaterThanOrEqual(6);
    expect(lines[0]).toContain('log message');
    expect(lines[0]).toContain('ContextName');
  });
});
