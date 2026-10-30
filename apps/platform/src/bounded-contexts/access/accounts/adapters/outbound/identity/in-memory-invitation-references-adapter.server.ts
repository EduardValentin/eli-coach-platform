import type { InvitationReferencesPort } from "~/bounded-contexts/access/accounts/domain/account";

export class InMemoryInvitationReferencesAdapter implements InvitationReferencesPort {
  async invitationIdOf(): Promise<string | null> {
    return null;
  }
}
