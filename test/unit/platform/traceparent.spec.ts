import { generateTraceparent, traceIdFrom } from '../../../src/platform/tracing/traceparent';

describe('traceparent', () => {
  it('generates a valid traceparent and extracts its trace id', () => {
    const traceparent = generateTraceparent();

    expect(traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
    expect(traceIdFrom(traceparent)).toHaveLength(32);
  });

  it('returns undefined when traceparent is absent', () => {
    expect(traceIdFrom(undefined)).toBeUndefined();
  });
});
