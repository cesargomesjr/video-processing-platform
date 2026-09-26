import { GetLiveness } from './get-liveness.js';

describe('GetLiveness', () => {
  it('reports that the running process is healthy', () => {
    const getLiveness = new GetLiveness();

    expect(getLiveness.execute()).toEqual({ status: 'healthy' });
  });
});
