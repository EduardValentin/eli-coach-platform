import type { InvitationReferencesPort } from "~/bounded-contexts/access/accounts/domain/account";

type ClerkUserClient = {
  users: {
    getUser(
      userId: string,
    ): Promise<{ publicMetadata: Record<string, unknown> }>;
  };
};

export class ClerkInvitationReferencesAdapter implements InvitationReferencesPort {
  constructor(private readonly client: ClerkUserClient) {}

  async invitationIdOf(authSubjectId: string): Promise<string | null> {
    const user = await this.client.users.getUser(authSubjectId);
    const invitationId = user.publicMetadata.invitationId;

    return typeof invitationId === "string" ? invitationId : null;
  }
}
