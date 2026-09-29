import { DataSource } from 'typeorm';

import { HealthService } from '../../../src/platform/health/health.service';

describe('HealthService', () => {
  it('reports ready when the database query succeeds', async () => {
    const dataSource = {
      query: (): Promise<void> => Promise.resolve(),
    } as unknown as DataSource;

    await expect(new HealthService(dataSource).isReady()).resolves.toBe(true);
  });

  it('reports not ready when the database query fails', async () => {
    const dataSource = {
      query: (): Promise<void> => Promise.reject(new Error('database unavailable')),
    } as unknown as DataSource;

    await expect(new HealthService(dataSource).isReady()).resolves.toBe(false);
  });
});
