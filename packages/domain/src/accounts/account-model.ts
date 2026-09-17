export type AccountRole = "CLIENT" | "COACH";

export type Account = {
  id: string;
  authSubjectId: string;
  role: AccountRole;
  deletedAt: Date | null;
};

export type AccountSnapshot = {
  authSubjectId: string;
  id: string;
  role: AccountRole;
};

export function isActiveAccount(account: Account): boolean {
  return account.deletedAt === null;
}

export function toAccountSnapshot(account: Account): AccountSnapshot {
  return {
    authSubjectId: account.authSubjectId,
    id: account.id,
    role: account.role,
  };
}

export function canAccessClientPortal(
  account: Pick<AccountSnapshot, "role">,
): boolean {
  return account.role === "CLIENT";
}

export function canAccessCoachPortal(
  account: Pick<AccountSnapshot, "role">,
): boolean {
  return account.role === "COACH";
}
