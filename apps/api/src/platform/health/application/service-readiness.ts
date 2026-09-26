export abstract class ObjectStorageReadiness {
  public abstract isReady(): Promise<boolean>;
}

export abstract class MessageBrokerReadiness {
  public abstract isReady(): Promise<boolean>;
}
