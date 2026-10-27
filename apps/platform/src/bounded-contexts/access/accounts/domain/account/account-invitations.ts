import type { AccountInvitation } from "./account-invitation";

export interface AccountInvitations {
  allow(invitation: AccountInvitation): Promise<void>;
  findById(invitationId: string): Promise<AccountInvitation | null>;
  findAcceptedBy(authSubjectId: string): Promise<AccountInvitation | null>;
  accept(acceptance: {
    invitationId: string;
    authSubjectId: string;
    at: Date;
  }): Promise<"accepted" | "raced">;
}
