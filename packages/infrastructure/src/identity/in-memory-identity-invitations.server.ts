import type {
  IdentityInvitation,
  IdentityInvitations,
} from "@eli-coach-platform/domain/client-invitation";

export class InMemoryIdentityInvitations implements IdentityInvitations {
  private createdCount = 0;

  constructor(private readonly options: { signUpUrl: string }) {}

  async create(): Promise<IdentityInvitation> {
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
