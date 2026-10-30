import type { Account } from "./account";

export type AccountsPort = {
  findByAuthSubjectId(authSubjectId: string): Promise<Account | null>;
  insert(account: Account): Promise<void>;
  softDeleteByAuthSubjectId(authSubjectId: string): Promise<void>;
};
