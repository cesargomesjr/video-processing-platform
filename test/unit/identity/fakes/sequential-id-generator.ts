import { IdGenerator } from '../../../../src/contexts/identity/application/ports/id-generator';

export class SequentialIdGenerator implements IdGenerator {
  private nextId = 0;

  public next(): string {
    this.nextId += 1;
    return `id-${this.nextId}`;
  }
}
