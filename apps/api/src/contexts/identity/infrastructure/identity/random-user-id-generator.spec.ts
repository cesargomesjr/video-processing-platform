import { UserId } from '../../domain/user-id.js';
import { RandomUserIdGenerator } from './random-user-id-generator.js';

describe('RandomUserIdGenerator', () => {
  it('generates a valid UUID', () => {
    const generated = new RandomUserIdGenerator().generate();

    expect(UserId.create(generated).toString()).toBe(generated);
  });
});
