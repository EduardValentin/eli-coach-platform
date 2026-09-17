import type { Account, AccountRole } from "./account";

export type Accounts = {
  findByAuthSubjectId(authSubjectId: string): Promise<Account | null>;
  insert(input: { authSubjectId: string; role: AccountRole }): Promise<Account>;
  softDeleteByAuthSubjectId(authSubjectId: string): Promise<void>;
};
