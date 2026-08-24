import { Account, type AccountRole, type AccountSnapshot } from "./account";

export class AccountDeletedError extends Error {
  constructor(authSubjectId: string) {
    super(`Account for ${authSubjectId} has been deleted.`);
    this.name = "AccountDeletedError";
  }
}

export type ProvisionAccountCommand = {
  authSubjectId: string;
  roleWhenNew: AccountRole;
};

export interface AccountRepository {
  /**
   * One idempotent operation rather than read-then-insert: `/auth/complete` is
   * entered twice per sign-in and two tabs can finish at once.
   */
  provisionByAuthSubjectId(
    command: ProvisionAccountCommand,
  ): Promise<AccountSnapshot>;
}

type AccountProvisioningOptions = {
  bootstrapCoachAuthSubjectId?: string;
  repository: AccountRepository;
};

export class AccountProvisioningService {
  private readonly bootstrapCoachAuthSubjectId?: string;
  private readonly repository: AccountRepository;

  constructor(options: AccountProvisioningOptions) {
    this.bootstrapCoachAuthSubjectId = options.bootstrapCoachAuthSubjectId;
    this.repository = options.repository;
  }

  async resolveAccount(authSubjectId: string): Promise<Account> {
    const snapshot = await this.repository.provisionByAuthSubjectId({
      authSubjectId,
      roleWhenNew: this.initialRoleFor(authSubjectId),
    });
    const account = Account.fromSnapshot(snapshot);

    if (account.isDeleted) {
      throw new AccountDeletedError(authSubjectId);
    }

    return account;
  }

  private initialRoleFor(authSubjectId: string): AccountRole {
    return authSubjectId === this.bootstrapCoachAuthSubjectId ? "COACH" : "USER";
  }
}
