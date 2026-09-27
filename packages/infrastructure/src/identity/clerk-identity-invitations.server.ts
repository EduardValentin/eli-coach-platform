import {
  INVITATION_VALIDITY_DAYS,
  type IdentityInvitation,
  type IdentityInvitations,
} from "@eli-coach-platform/domain/client-invitation";

import type { IdentityInvitationUrls } from "./identity-invitation-urls.server";

type ClerkInvitationClient = {
  invitations: {
    createInvitation(params: {
      emailAddress: string;
      notify: boolean;
      expiresInDays: number;
      publicMetadata: { invitationId: string };
      redirectUrl: string;
    }): Promise<{ id: string; url?: string }>;
  };
  users: {
    getUser(
      userId: string,
    ): Promise<{ publicMetadata: Record<string, unknown> }>;
  };
};

export class ClerkIdentityInvitations implements IdentityInvitations {
  private readonly redirectUrl: string;

  constructor(
    private readonly client: ClerkInvitationClient,
    urls: IdentityInvitationUrls,
  ) {
    this.redirectUrl = hostedSignUpReturningTo(urls);
  }

  async create(input: {
    email: string;
    invitationId: string;
  }): Promise<IdentityInvitation> {
    const invitation = await this.client.invitations
      .createInvitation({
        emailAddress: input.email,
        notify: false,
        expiresInDays: INVITATION_VALIDITY_DAYS,
        publicMetadata: { invitationId: input.invitationId },
        redirectUrl: this.redirectUrl,
      })
      .catch((error: unknown) => {
        throw new Error(
          `Clerk did not create the identity invitation for ${input.invitationId} (status ${clerkStatusOf(error)}).`,
        );
      });

    if (!invitation.url) {
      throw new Error(`Clerk invitation ${invitation.id} carries no URL.`);
    }

    return { id: invitation.id, url: invitation.url };
  }

  async findInvitationIdForSubject(
    authSubjectId: string,
  ): Promise<string | null> {
    const user = await this.client.users.getUser(authSubjectId);
    const invitationId = user.publicMetadata.invitationId;

    return typeof invitationId === "string" ? invitationId : null;
  }
}

function hostedSignUpReturningTo(urls: IdentityInvitationUrls): string {
  const signUp = new URL(urls.signUpUrl);
  signUp.searchParams.set("redirect_url", urls.returnUrl);

  return signUp.toString();
}

function clerkStatusOf(error: unknown): string {
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? error.status
      : null;

  return typeof status === "number" ? String(status) : "unknown";
}
