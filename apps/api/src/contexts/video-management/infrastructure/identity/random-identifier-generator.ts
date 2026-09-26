import { randomUUID } from 'node:crypto';
import { IdentifierGenerator } from '../../application/ports/video-ports.js';

export class RandomIdentifierGenerator extends IdentifierGenerator {
  public override generate(): string {
    return randomUUID();
  }
}
