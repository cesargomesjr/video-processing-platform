import type { DatabaseReadiness } from './database-readiness.js';

export type Readiness = Readonly<{
  status: 'ready' | 'unavailable';
  checks: Readonly<{
    database: 'up' | 'down';
  }>;
}>;

export class GetReadiness {
  public constructor(private readonly databaseReadiness: DatabaseReadiness) {}

  public async execute(): Promise<Readiness> {
    const databaseIsReady = await this.databaseReadiness.isReady();

    return {
      status: databaseIsReady ? 'ready' : 'unavailable',
      checks: { database: databaseIsReady ? 'up' : 'down' },
    };
  }
}
