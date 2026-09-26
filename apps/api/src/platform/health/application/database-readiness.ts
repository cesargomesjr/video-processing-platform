export abstract class DatabaseReadiness {
  public abstract isReady(): Promise<boolean>;
}
