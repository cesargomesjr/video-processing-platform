import { DataSource } from 'typeorm';

export class HealthService {
  public constructor(private readonly dataSource: DataSource) {}

  public async isReady(): Promise<boolean> {
    try {
      await this.dataSource.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}
