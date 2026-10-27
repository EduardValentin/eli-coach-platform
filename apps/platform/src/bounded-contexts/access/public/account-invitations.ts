import type { AccountRole } from "./session";

type AccountInvitationDto = {
  invitationId: string;
  email: string;
  role: AccountRole;
  expiresAt: string;
};

export interface AccountInvitationsFacade {
  allowAccount(invitation: AccountInvitationDto): Promise<void>;
  acceptedInvitationOf(authSubjectId: string): Promise<string | null>;
}
