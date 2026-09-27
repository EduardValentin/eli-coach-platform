export class InMemoryIdentityInvitations {
  private createdCount = 0;

  constructor(private readonly options: { signUpUrl: string }) {}

  async create(): Promise<{ id: string; url: string }> {
    this.createdCount += 1;

    return {
      id: `inv_memory_${this.createdCount}`,
      url: `${this.options.signUpUrl}?__clerk_ticket=memory`,
    };
  }

  async findInvitationIdForSubject(): Promise<string | null> {
    return null;
  }
}
