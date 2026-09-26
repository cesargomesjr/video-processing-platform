import { MessageBrokerReadiness } from '../application/service-readiness.js';

type RabbitHealthClient = Readonly<{ isReady(): Promise<boolean> }>;

export class RabbitMqMessageBrokerReadiness extends MessageBrokerReadiness {
  public constructor(private readonly publisher: RabbitHealthClient) {
    super();
  }

  public override isReady(): Promise<boolean> {
    return this.publisher.isReady();
  }
}
