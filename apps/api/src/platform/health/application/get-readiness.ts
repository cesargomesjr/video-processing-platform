import type { DatabaseReadiness } from './database-readiness.js';
import type {
  MessageBrokerReadiness,
  ObjectStorageReadiness,
} from './service-readiness.js';

export type Readiness = Readonly<{
  status: 'ready' | 'unavailable';
  checks: Readonly<{
    database: 'up' | 'down';
    objectStorage: 'up' | 'down';
    messageBroker: 'up' | 'down';
  }>;
}>;

export class GetReadiness {
  public constructor(
    private readonly databaseReadiness: DatabaseReadiness,
    private readonly objectStorageReadiness: ObjectStorageReadiness,
    private readonly messageBrokerReadiness: MessageBrokerReadiness,
  ) {}

  public async execute(): Promise<Readiness> {
    const [database, objectStorage, messageBroker] = await Promise.all([
      this.databaseReadiness.isReady(),
      this.objectStorageReadiness.isReady(),
      this.messageBrokerReadiness.isReady(),
    ]);
    return {
      status:
        database && objectStorage && messageBroker ? 'ready' : 'unavailable',
      checks: {
        database: database ? 'up' : 'down',
        objectStorage: objectStorage ? 'up' : 'down',
        messageBroker: messageBroker ? 'up' : 'down',
      },
    };
  }
}
