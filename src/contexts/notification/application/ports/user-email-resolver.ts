export interface UserEmailResolver {
  resolve(userId: string): Promise<string>;
}
