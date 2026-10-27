import type { InvitationReferences } from "~/bounded-contexts/access/accounts/domain/account";

export class InMemoryInvitationReferences implements InvitationReferences {
  async invitationIdOf(): Promise<string | null> {
    return null;
  }
}
