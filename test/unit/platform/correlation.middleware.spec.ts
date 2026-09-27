import {
  CorrelationRequest,
  CorrelationResponse,
  createCorrelationMiddleware,
} from '../../../src/platform/logger/correlation.middleware';
import { getCorrelationId } from '../../../src/platform/logger/correlation-context';

interface CollectedLog {
  obj: Record<string, unknown>;
  message: string;
}

interface Fakes {
  request: CorrelationRequest;
  response: CorrelationResponse;
  logs: CollectedLog[];
  next: jest.Mock;
  logger: {
    info: (obj: Record<string, unknown>, message: string) => void;
  };
  triggerFinish: () => void;
}

function createFakes(overrides: Partial<CorrelationRequest> = {}): Fakes {
  const logs: CollectedLog[] = [];
  let finishListener: (() => void) | undefined;

  const request: CorrelationRequest = {
    method: 'GET',
    originalUrl: '/videos',
    header: () => undefined,
    ...overrides,
  };

  const response: CorrelationResponse = {
    statusCode: 200,
    setHeader: () => undefined,
    on: (_event, listener) => {
      finishListener = listener;
    },
  };

  return {
    request,
    response,
    logs,
    next: jest.fn(),
    logger: {
      info: (obj: Record<string, unknown>, message: string): void => {
        logs.push({ obj, message });
      },
    },
    triggerFinish: (): void => finishListener?.(),
  };
}

describe('createCorrelationMiddleware', () => {
  it('reuses a valid incoming correlation id and logs the completed request', () => {
    const fakes = createFakes({ header: () => 'incoming-1' });
    const middleware = createCorrelationMiddleware({ logger: fakes.logger });

    const setHeader = jest.fn();
    fakes.response.setHeader = setHeader;

    middleware(fakes.request, fakes.response, fakes.next);
    fakes.triggerFinish();

    expect(setHeader).toHaveBeenCalledWith('x-correlation-id', 'incoming-1');
    expect(fakes.next).toHaveBeenCalledTimes(1);
    expect(fakes.logs).toHaveLength(1);
    expect(fakes.logs[0]).toMatchObject({
      message: 'http.request.completed',
      obj: {
        correlationId: 'incoming-1',
        method: 'GET',
        url: '/videos',
        statusCode: 200,
      },
    });
  });

  it('generates a new id when the header is missing', () => {
    const fakes = createFakes();
    const middleware = createCorrelationMiddleware({
      logger: fakes.logger,
      generateId: () => 'generated-1',
    });
    const setHeader = jest.fn();
    fakes.response.setHeader = setHeader;

    middleware(fakes.request, fakes.response, fakes.next);
    fakes.triggerFinish();

    expect(setHeader).toHaveBeenCalledWith('x-correlation-id', 'generated-1');
    expect(fakes.logs[0]!.obj.correlationId).toBe('generated-1');
  });

  it('falls back to a generated id when the incoming header is unsafe', () => {
    const fakes = createFakes({ header: () => 'not a valid id\n' });
    const middleware = createCorrelationMiddleware({
      logger: fakes.logger,
      generateId: () => 'generated-2',
    });

    middleware(fakes.request, fakes.response, fakes.next);
    fakes.triggerFinish();

    expect(fakes.logs[0]!.obj.correlationId).toBe('generated-2');
  });

  it('makes the correlation id available to the next handler', () => {
    const fakes = createFakes({ header: () => 'incoming-2' });
    const middleware = createCorrelationMiddleware({ logger: fakes.logger });

    let seenInside: string | undefined;

    middleware(fakes.request, fakes.response, () => {
      seenInside = getCorrelationId();
    });

    expect(seenInside).toBe('incoming-2');
  });
});
