import { DatabaseReadiness } from './database-readiness.js';
import { GetReadiness } from './get-readiness.js';

class StubDatabaseReadiness extends DatabaseReadiness {
  public ready = true;

  public isReady(): Promise<boolean> {
    return Promise.resolve(this.ready);
  }
}

describe('GetReadiness', () => {
  it('reports ready when PostgreSQL responds', async () => {
    const databaseReadiness = new StubDatabaseReadiness();

    await expect(
      new GetReadiness(databaseReadiness).execute(),
    ).resolves.toEqual({
      status: 'ready',
      checks: { database: 'up' },
    });
  });

  it('reports unavailable when PostgreSQL does not respond', async () => {
    const databaseReadiness = new StubDatabaseReadiness();
    databaseReadiness.ready = false;

    await expect(
      new GetReadiness(databaseReadiness).execute(),
    ).resolves.toEqual({
      status: 'unavailable',
      checks: { database: 'down' },
    });
  });
});
