export type AccountRole = "USER" | "CLIENT" | "COACH";

export type Account = {
  id: string;
  authSubjectId: string;
  role: AccountRole;
  deletedAt: Date | null;
};

export function canAccessClientPortal(account: Account): boolean {
  return account.role === "CLIENT";
}

export function canAccessCoachPortal(account: Account): boolean {
  return account.role === "COACH";
}
