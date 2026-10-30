import type {
  AccountInvitation,
  IdentityInvitation,
} from "./account-invitation";

export interface AccountInvitationsPort {
  findById(invitationId: string): Promise<AccountInvitation | null>;
  findByTokenHash(tokenHash: string): Promise<AccountInvitation | null>;
  findAcceptedBy(authSubjectId: string): Promise<AccountInvitation | null>;
  insert(invitation: AccountInvitation): Promise<void>;
  reissue(invitation: AccountInvitation): Promise<void>;
  recordProvider(input: {
    invitationId: string;
    provider: IdentityInvitation;
  }): Promise<void>;
  recordEmailSent(input: { invitationId: string; at: Date }): Promise<void>;
  recordEmailDeliveryFailed(input: {
    invitationId: string;
    at: Date;
  }): Promise<void>;
  accept(acceptance: {
    invitationId: string;
    authSubjectId: string;
    at: Date;
  }): Promise<"accepted" | "raced">;
}
