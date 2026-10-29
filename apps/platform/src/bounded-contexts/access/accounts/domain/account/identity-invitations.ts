import type { IdentityInvitation } from "./account-invitation";

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
}
