import type { AccountRole } from "./account";

export const INVITATION_VALIDITY_DAYS = 30;

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export type InvitedAccountRole = Extract<AccountRole, "CLIENT">;

export type InvitationStanding = "pending" | "expired" | "email-failed";

export type IdentityInvitation = { id: string; url: string };

export type AccountInvitationSnapshot = {
  id: string;
  email: string;
  role: AccountRole;
  tokenHash: string;
  sentAt: Date;
  expiresAt: Date;
  provider: IdentityInvitation | null;
  emailSentAt: Date | null;
  emailDeliveryFailedAt: Date | null;
  acceptedByAuthSubjectId: string | null;
  acceptedAt: Date | null;
};

function validityEndFor(sentAt: Date): Date {
  return new Date(
    sentAt.getTime() + INVITATION_VALIDITY_DAYS * MILLISECONDS_PER_DAY,
  );
}

export class AccountInvitation {
  readonly id: string;
  readonly email: string;
  readonly role: AccountRole;
  readonly tokenHash: string;
  readonly sentAt: Date;
  readonly expiresAt: Date;
  readonly provider: IdentityInvitation | null;
  readonly emailSentAt: Date | null;
  readonly emailDeliveryFailedAt: Date | null;
  readonly acceptedByAuthSubjectId: string | null;
  readonly acceptedAt: Date | null;

  private constructor(snapshot: AccountInvitationSnapshot) {
    this.id = snapshot.id;
    this.email = snapshot.email;
    this.role = snapshot.role;
    this.tokenHash = snapshot.tokenHash;
    this.sentAt = snapshot.sentAt;
    this.expiresAt = snapshot.expiresAt;
    this.provider = snapshot.provider;
    this.emailSentAt = snapshot.emailSentAt;
    this.emailDeliveryFailedAt = snapshot.emailDeliveryFailedAt;
    this.acceptedByAuthSubjectId = snapshot.acceptedByAuthSubjectId;
    this.acceptedAt = snapshot.acceptedAt;
  }

  static issue(input: {
    id: string;
    email: string;
    role: InvitedAccountRole;
    tokenHash: string;
    sentAt: Date;
  }): AccountInvitation {
    return new AccountInvitation({
      ...input,
      expiresAt: validityEndFor(input.sentAt),
      provider: null,
      emailSentAt: null,
      emailDeliveryFailedAt: null,
      acceptedByAuthSubjectId: null,
      acceptedAt: null,
    });
  }

  static reconstitute(snapshot: AccountInvitationSnapshot): AccountInvitation {
    return new AccountInvitation(snapshot);
  }

  reissue(input: { tokenHash: string; sentAt: Date }): AccountInvitation {
    return new AccountInvitation({
      ...this.toSnapshot(),
      tokenHash: input.tokenHash,
      sentAt: input.sentAt,
      expiresAt: validityEndFor(input.sentAt),
      emailSentAt: null,
      emailDeliveryFailedAt: null,
    });
  }

  invitesClient(): boolean {
    return this.role === "CLIENT";
  }

  isAccepted(): boolean {
    return this.acceptedAt !== null;
  }

  isPending(now: Date): boolean {
    return !this.isAccepted() && now < this.expiresAt;
  }

  wasAcceptedBy(authSubjectId: string): boolean {
    return this.isAccepted() && this.acceptedByAuthSubjectId === authSubjectId;
  }

  awaitsEmail(): boolean {
    return this.emailSentAt === null && this.emailDeliveryFailedAt === null;
  }

  standing(now: Date): InvitationStanding {
    if (this.emailDeliveryFailedAt || this.awaitsEmail()) {
      return "email-failed";
    }

    return now < this.expiresAt ? "pending" : "expired";
  }

  toSnapshot(): AccountInvitationSnapshot {
    return {
      id: this.id,
      email: this.email,
      role: this.role,
      tokenHash: this.tokenHash,
      sentAt: this.sentAt,
      expiresAt: this.expiresAt,
      provider: this.provider,
      emailSentAt: this.emailSentAt,
      emailDeliveryFailedAt: this.emailDeliveryFailedAt,
      acceptedByAuthSubjectId: this.acceptedByAuthSubjectId,
      acceptedAt: this.acceptedAt,
    };
  }
}
