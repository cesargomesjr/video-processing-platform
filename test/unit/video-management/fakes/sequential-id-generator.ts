import { IdGenerator } from '../../../../src/contexts/video-management/application/ports/id-generator';

export class SequentialIdGenerator implements IdGenerator {
  private nextId = 0;

  public next(): string {
    this.nextId += 1;
    return `video-${this.nextId}`;
  }
}
