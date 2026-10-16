import type { Account } from "./account";

export type Accounts = {
  findByAuthSubjectId(authSubjectId: string): Promise<Account | null>;
  insert(account: Account): Promise<void>;
  softDeleteByAuthSubjectId(authSubjectId: string): Promise<void>;
};
