import {
  getCorrelationId,
  runWithCorrelationId,
} from '../../../src/platform/logger/correlation-context';

describe('correlation context', () => {
  it('exposes the correlation id only while running inside the context', () => {
    expect(getCorrelationId()).toBeUndefined();

    const captured = runWithCorrelationId('corr-123', () => getCorrelationId());

    expect(captured).toBe('corr-123');
    expect(getCorrelationId()).toBeUndefined();
  });

  it('restores the outer correlation id after a nested run', () => {
    runWithCorrelationId('outer', () => {
      expect(getCorrelationId()).toBe('outer');

      runWithCorrelationId('inner', () => {
        expect(getCorrelationId()).toBe('inner');
      });

      expect(getCorrelationId()).toBe('outer');
    });
  });
});
