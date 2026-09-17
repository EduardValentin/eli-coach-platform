export type AccountRole = "CLIENT" | "COACH";

export type AccountSnapshot = {
  authSubjectId: string;
  id: string;
  role: AccountRole;
};

type AccountProps = {
  id: string;
  authSubjectId: string;
  role: AccountRole;
  deletedAt: Date | null;
};

export class Account {
  readonly id: string;
  readonly authSubjectId: string;
  readonly role: AccountRole;
  readonly deletedAt: Date | null;

  private constructor(props: AccountProps) {
    this.id = props.id;
    this.authSubjectId = props.authSubjectId;
    this.role = props.role;
    this.deletedAt = props.deletedAt;
  }

  static reconstitute(props: AccountProps): Account {
    return new Account(props);
  }

  static canAccessClientPortal(
    account: Pick<AccountSnapshot, "role">,
  ): boolean {
    return account.role === "CLIENT";
  }

  static canAccessCoachPortal(account: Pick<AccountSnapshot, "role">): boolean {
    return account.role === "COACH";
  }

  isActive(): boolean {
    return this.deletedAt === null;
  }

  toSnapshot(): AccountSnapshot {
    return { authSubjectId: this.authSubjectId, id: this.id, role: this.role };
  }
}
