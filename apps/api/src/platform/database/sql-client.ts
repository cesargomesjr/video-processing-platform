export type SqlQueryResult = Readonly<{
  rows: readonly unknown[];
}>;

export abstract class SqlClient {
  public abstract query(
    statement: string,
    parameters?: readonly unknown[],
  ): Promise<SqlQueryResult>;

  public abstract close(): Promise<void>;
}
