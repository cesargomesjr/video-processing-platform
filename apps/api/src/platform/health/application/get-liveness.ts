export type Liveness = Readonly<{
  status: 'healthy';
}>;

export class GetLiveness {
  public execute(): Liveness {
    return { status: 'healthy' };
  }
}
