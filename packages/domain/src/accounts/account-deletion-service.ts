import type { Accounts } from "./accounts";

export class AccountDeletionService {
  constructor(private readonly options: { accounts: Accounts }) {}

  async markDeleted(authSubjectId: string): Promise<void> {
    await this.options.accounts.softDeleteByAuthSubjectId(authSubjectId);
  }
}
