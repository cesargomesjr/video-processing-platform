import { UuidIdGenerator } from '../../../src/contexts/identity/infrastructure/uuid-id-generator';

describe('UuidIdGenerator', () => {
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

  it('generates unique valid UUIDs', () => {
    const generator = new UuidIdGenerator();

    const first = generator.next();
    const second = generator.next();

    expect(first).toMatch(UUID_PATTERN);
    expect(second).toMatch(UUID_PATTERN);
    expect(first).not.toBe(second);
  });
});
