import { randomUUID } from 'node:crypto';
import { UserIdGenerator } from '../../application/ports/user-id-generator.js';

export class RandomUserIdGenerator extends UserIdGenerator {
  public override generate(): string {
    return randomUUID();
  }
}
