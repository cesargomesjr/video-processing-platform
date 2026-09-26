import type { SqlClient } from '../../database/sql-client.js';
import { DatabaseReadiness } from '../application/database-readiness.js';

export class PostgresDatabaseReadiness extends DatabaseReadiness {
  public constructor(private readonly sqlClient: SqlClient) {
    super();
  }

  public override async isReady(): Promise<boolean> {
    try {
      await this.sqlClient.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}
