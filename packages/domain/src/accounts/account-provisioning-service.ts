import { Account, type AccountRole, type AccountSnapshot } from "./account";

export type { AccountSnapshot };

/**
 * Distinguishable on purpose: a caller has to tell "this person no longer has
 * an account" apart from "the database is down", because the first is a normal
 * signed-out answer and the second must not be reported as one.
 */
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
   * Resolves the account for an identity, creating it with `roleWhenNew` only
   * when none exists. One idempotent operation rather than read-then-insert,
   * because `/auth/complete` is entered twice per sign-in and two tabs can
   * finish at once.
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

  /**
   * The only path to an elevated role that no public flow can reach: a single
   * configured identity, matched by subject rather than by email.
   */
  private initialRoleFor(authSubjectId: string): AccountRole {
    return authSubjectId === this.bootstrapCoachAuthSubjectId ? "COACH" : "USER";
  }
}
