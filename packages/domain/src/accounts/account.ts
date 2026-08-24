export type AccountRole = "USER" | "CLIENT" | "COACH";

export type Portal = "client" | "coach";

export type AccountSnapshot = {
  id: string;
  role: AccountRole;
  deleted: boolean;
};

const portalByRole: Record<AccountRole, Portal | null> = {
  USER: null,
  CLIENT: "client",
  COACH: "coach",
};

export class Account {
  static fromSnapshot(snapshot: AccountSnapshot): Account {
    return new Account(snapshot);
  }

  private constructor(private readonly snapshot: AccountSnapshot) {}

  get id(): string {
    return this.snapshot.id;
  }

  get role(): AccountRole {
    return this.snapshot.role;
  }

  get isDeleted(): boolean {
    return this.snapshot.deleted;
  }

  canReach(portal: Portal): boolean {
    return portalByRole[this.snapshot.role] === portal;
  }
}
