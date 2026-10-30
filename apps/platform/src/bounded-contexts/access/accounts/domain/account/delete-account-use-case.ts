import type { AccountsPort } from "./accounts-port";

export class DeleteAccountUseCase {
  constructor(private readonly options: { accounts: AccountsPort }) {}

  async execute(authSubjectId: string): Promise<void> {
    await this.options.accounts.softDeleteByAuthSubjectId(authSubjectId);
  }
}
