import type { IdentityInvitation } from "./client-invitation";

export interface IdentityInvitations {
  create(input: {
    email: string;
    invitationId: string;
  }): Promise<IdentityInvitation>;
  replace(input: {
    email: string;
    invitationId: string;
    previous: IdentityInvitation;
  }): Promise<IdentityInvitation>;
  findInvitationIdForSubject(authSubjectId: string): Promise<string | null>;
}
