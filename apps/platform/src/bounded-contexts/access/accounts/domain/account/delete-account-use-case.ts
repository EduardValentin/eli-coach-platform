import type { AccountsPort } from "./accounts-port";

export class DeleteAccountUseCase {
  constructor(private readonly options: { accountsPort: AccountsPort }) {}

  async execute(authSubjectId: string): Promise<void> {
    await this.options.accountsPort.softDeleteByAuthSubjectId(authSubjectId);
  }
}
