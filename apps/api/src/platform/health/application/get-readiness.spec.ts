import { DatabaseReadiness } from './database-readiness.js';
import { GetReadiness } from './get-readiness.js';
import {
  MessageBrokerReadiness,
  ObjectStorageReadiness,
} from './service-readiness.js';

class StubDatabaseReadiness extends DatabaseReadiness {
  public ready = true;
  public isReady(): Promise<boolean> {
    return Promise.resolve(this.ready);
  }
}
class StubStorageReadiness extends ObjectStorageReadiness {
  public ready = true;
  public isReady(): Promise<boolean> {
    return Promise.resolve(this.ready);
  }
}
class StubBrokerReadiness extends MessageBrokerReadiness {
  public ready = true;
  public isReady(): Promise<boolean> {
    return Promise.resolve(this.ready);
  }
}

describe('GetReadiness', () => {
  it('reports ready when every required dependency responds', async () => {
    await expect(
      new GetReadiness(
        new StubDatabaseReadiness(),
        new StubStorageReadiness(),
        new StubBrokerReadiness(),
      ).execute(),
    ).resolves.toEqual({
      status: 'ready',
      checks: { database: 'up', objectStorage: 'up', messageBroker: 'up' },
    });
  });

  it.each(['database', 'objectStorage', 'messageBroker'] as const)(
    'reports unavailable when %s is down',
    async (dependency) => {
      const database = new StubDatabaseReadiness();
      const storage = new StubStorageReadiness();
      const broker = new StubBrokerReadiness();
      if (dependency === 'database') database.ready = false;
      if (dependency === 'objectStorage') storage.ready = false;
      if (dependency === 'messageBroker') broker.ready = false;
      const result = await new GetReadiness(
        database,
        storage,
        broker,
      ).execute();
      expect(result.status).toBe('unavailable');
      expect(result.checks[dependency]).toBe('down');
    },
  );
});
