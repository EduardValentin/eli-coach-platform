import type { Accounts } from "./accounts";

export class DeleteAccountUseCase {
  constructor(private readonly options: { accounts: Accounts }) {}

  async execute(authSubjectId: string): Promise<void> {
    await this.options.accounts.softDeleteByAuthSubjectId(authSubjectId);
  }
}
