export const INVITATION_VALIDITY_DAYS = 30;

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export type InvitationResolution = "valid" | "expired" | "used";

export type IdentityInvitation = { id: string; url: string };

type ClientInvitationProps = {
  id: string;
  clientId: string;
  email: string;
  tokenHash: string;
  sentAt: Date;
  expiresAt: Date;
  usedAt: Date | null;
  acceptedByAuthSubjectId: string | null;
  provider: IdentityInvitation | null;
  emailSentAt: Date | null;
  emailDeliveryFailedAt: Date | null;
};

function validityEndFor(sentAt: Date): Date {
  return new Date(
    sentAt.getTime() + INVITATION_VALIDITY_DAYS * MILLISECONDS_PER_DAY,
  );
}

export class ClientInvitation {
  readonly id: string;
  readonly clientId: string;
  readonly email: string;
  readonly tokenHash: string;
  readonly sentAt: Date;
  readonly expiresAt: Date;
  readonly usedAt: Date | null;
  readonly acceptedByAuthSubjectId: string | null;
  readonly provider: IdentityInvitation | null;
  readonly emailSentAt: Date | null;
  readonly emailDeliveryFailedAt: Date | null;

  private constructor(props: ClientInvitationProps) {
    this.id = props.id;
    this.clientId = props.clientId;
    this.email = props.email;
    this.tokenHash = props.tokenHash;
    this.sentAt = props.sentAt;
    this.expiresAt = props.expiresAt;
    this.usedAt = props.usedAt;
    this.acceptedByAuthSubjectId = props.acceptedByAuthSubjectId;
    this.provider = props.provider;
    this.emailSentAt = props.emailSentAt;
    this.emailDeliveryFailedAt = props.emailDeliveryFailedAt;
  }

  static reconstitute(props: ClientInvitationProps): ClientInvitation {
    return new ClientInvitation(props);
  }

  static issue(input: {
    id: string;
    clientId: string;
    email: string;
    tokenHash: string;
    sentAt: Date;
  }): ClientInvitation {
    return new ClientInvitation({
      ...input,
      expiresAt: validityEndFor(input.sentAt),
      usedAt: null,
      acceptedByAuthSubjectId: null,
      provider: null,
      emailSentAt: null,
      emailDeliveryFailedAt: null,
    });
  }

  reissue(input: { tokenHash: string; sentAt: Date }): ClientInvitation {
    return new ClientInvitation({
      ...this,
      tokenHash: input.tokenHash,
      sentAt: input.sentAt,
      expiresAt: validityEndFor(input.sentAt),
      emailSentAt: null,
      emailDeliveryFailedAt: null,
    });
  }

  resolve(now: Date): InvitationResolution {
    if (this.usedAt) {
      return "used";
    }

    return now < this.expiresAt ? "valid" : "expired";
  }

  isPending(now: Date): boolean {
    return this.resolve(now) === "valid";
  }

  wasAcceptedBy(authSubjectId: string): boolean {
    return (
      this.usedAt !== null && this.acceptedByAuthSubjectId === authSubjectId
    );
  }

  awaitsEmail(): boolean {
    return this.emailSentAt === null && this.emailDeliveryFailedAt === null;
  }
}
