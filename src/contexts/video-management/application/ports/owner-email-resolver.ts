export interface OwnerEmailResolver {
  resolve(ownerId: string): Promise<string>;
}
