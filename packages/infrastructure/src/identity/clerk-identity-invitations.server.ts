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
      ignoreExisting: boolean;
      notify: boolean;
      expiresInDays: number;
      publicMetadata: { invitationId: string };
      redirectUrl: string;
    }): Promise<{ id: string; url?: string }>;
    revokeInvitation(invitationId: string): Promise<unknown>;
  };
  users: {
    getUser(
      userId: string,
    ): Promise<{ publicMetadata: Record<string, unknown> }>;
  };
};

const SETTLED_REVOCATION_CODES: ReadonlySet<string> = new Set([
  "invitation_revoked",
  "invitation_cannot_be_revoked_code",
]);

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
        ignoreExisting: true,
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

  async replace(input: {
    email: string;
    invitationId: string;
    previous: IdentityInvitation;
  }): Promise<IdentityInvitation> {
    await this.client.invitations
      .revokeInvitation(input.previous.id)
      .catch((error: unknown) => {
        if (isSettledRevocation(error)) {
          return;
        }

        throw new Error(
          `Clerk did not revoke the identity invitation ${input.previous.id} for ${input.invitationId} (status ${clerkStatusOf(error)}).`,
        );
      });

    return this.create(input);
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

function isSettledRevocation(error: unknown): boolean {
  const status = numericStatusOf(error);

  if (status === 404) {
    return true;
  }

  return (
    status === 400 &&
    clerkErrorCodesOf(error).some((code) => SETTLED_REVOCATION_CODES.has(code))
  );
}

function clerkStatusOf(error: unknown): string {
  const status = numericStatusOf(error);

  return status === null ? "unknown" : String(status);
}

function numericStatusOf(error: unknown): number | null {
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? error.status
      : null;

  return typeof status === "number" ? status : null;
}

function clerkErrorCodesOf(error: unknown): string[] {
  const errors =
    typeof error === "object" && error !== null && "errors" in error
      ? error.errors
      : null;

  if (!Array.isArray(errors)) {
    return [];
  }

  return errors.flatMap((entry: unknown) =>
    typeof entry === "object" &&
    entry !== null &&
    "code" in entry &&
    typeof entry.code === "string"
      ? [entry.code]
      : [],
  );
}
