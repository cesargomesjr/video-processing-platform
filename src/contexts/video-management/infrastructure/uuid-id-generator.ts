import { randomUUID } from 'node:crypto';

import { IdGenerator } from '../application/ports/id-generator';

export class UuidIdGenerator implements IdGenerator {
  public next(): string {
    return randomUUID();
  }
}
