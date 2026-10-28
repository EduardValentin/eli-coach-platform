import type { AccountRole } from "./session";

type InvitedAccountRole = Extract<AccountRole, "CLIENT">;

type AccountInvitationDto = {
  invitationId: string;
  email: string;
  role: InvitedAccountRole;
  expiresAt: string;
};

export interface AccountInvitationsFacade {
  allowAccount(invitation: AccountInvitationDto): Promise<void>;
  acceptedInvitationOf(authSubjectId: string): Promise<string | null>;
}
