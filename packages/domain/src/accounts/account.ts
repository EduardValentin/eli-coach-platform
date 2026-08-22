export type AccountRole = "USER" | "CLIENT" | "COACH";

/** The two authenticated products a role can grant entry to. */
export type Portal = "client" | "coach";

export type AccountSnapshot = {
  id: string;
  authSubjectId: string | null;
  role: AccountRole;
  deleted: boolean;
};

const portalByRole: Record<AccountRole, Portal | null> = {
  USER: null,
  CLIENT: "client",
  COACH: "coach",
};

/**
 * A person's stable identity inside the application, independent of whichever
 * identity provider authenticated her. Callers ask the account what it may
 * reach rather than comparing roles themselves.
 */
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

  reachablePortal(): Portal | null {
    return portalByRole[this.snapshot.role];
  }

  canReach(portal: Portal): boolean {
    return this.reachablePortal() === portal;
  }
}
