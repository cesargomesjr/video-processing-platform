const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function assertUuid(value: string, name: string): void {
  if (!UUID_PATTERN.test(value)) {
    throw new Error(`${name} must be a valid UUID`);
  }
}

export class VideoId {
  private constructor(private readonly value: string) {}

  public static create(value: string): VideoId {
    assertUuid(value, 'VideoId');
    return new VideoId(value.toLowerCase());
  }

  public toString(): string {
    return this.value;
  }
}

export class VideoOwnerId {
  private constructor(private readonly value: string) {}

  public static create(value: string): VideoOwnerId {
    assertUuid(value, 'VideoOwnerId');
    return new VideoOwnerId(value.toLowerCase());
  }

  public toString(): string {
    return this.value;
  }
}
