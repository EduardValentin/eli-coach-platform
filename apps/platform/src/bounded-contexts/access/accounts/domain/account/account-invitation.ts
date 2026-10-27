import type { AccountRole } from "./account";

export type AccountInvitationSnapshot = {
  id: string;
  email: string;
  role: AccountRole;
  expiresAt: Date;
  acceptedByAuthSubjectId: string | null;
  acceptedAt: Date | null;
};

export class AccountInvitation {
  readonly id: string;
  readonly email: string;
  readonly role: AccountRole;
  readonly expiresAt: Date;
  readonly acceptedByAuthSubjectId: string | null;
  readonly acceptedAt: Date | null;

  private constructor(snapshot: AccountInvitationSnapshot) {
    this.id = snapshot.id;
    this.email = snapshot.email;
    this.role = snapshot.role;
    this.expiresAt = snapshot.expiresAt;
    this.acceptedByAuthSubjectId = snapshot.acceptedByAuthSubjectId;
    this.acceptedAt = snapshot.acceptedAt;
  }

  static allowed(input: {
    id: string;
    email: string;
    role: AccountRole;
    expiresAt: Date;
  }): AccountInvitation {
    return new AccountInvitation({
      ...input,
      acceptedByAuthSubjectId: null,
      acceptedAt: null,
    });
  }

  static reconstitute(snapshot: AccountInvitationSnapshot): AccountInvitation {
    return new AccountInvitation(snapshot);
  }

  isPending(now: Date): boolean {
    return this.acceptedAt === null && now < this.expiresAt;
  }

  wasAcceptedBy(authSubjectId: string): boolean {
    return (
      this.acceptedAt !== null && this.acceptedByAuthSubjectId === authSubjectId
    );
  }

  toSnapshot(): AccountInvitationSnapshot {
    return {
      id: this.id,
      email: this.email,
      role: this.role,
      expiresAt: this.expiresAt,
      acceptedByAuthSubjectId: this.acceptedByAuthSubjectId,
      acceptedAt: this.acceptedAt,
    };
  }
}
