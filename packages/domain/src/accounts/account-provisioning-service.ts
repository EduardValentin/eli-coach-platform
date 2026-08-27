import type { Account } from "./account-model";
import type { AccountRepository } from "./account-repository";

export type AccountProvisioningResult =
  | { outcome: "active"; account: Account }
  | { outcome: "rejected-deleted" };

function toProvisioningResult(account: Account): AccountProvisioningResult {
  return account.deletedAt
    ? { outcome: "rejected-deleted" }
    : { outcome: "active", account };
}

export class AccountProvisioningService {
  private readonly repository: AccountRepository;
  private readonly bootstrapCoachAuthSubjectId: string | undefined;

  constructor(options: {
    repository: AccountRepository;
    bootstrapCoachAuthSubjectId?: string;
  }) {
    this.repository = options.repository;
    this.bootstrapCoachAuthSubjectId = options.bootstrapCoachAuthSubjectId;
  }

  async ensureAccount(authSubjectId: string): Promise<AccountProvisioningResult> {
    const existing = await this.repository.findByAuthSubjectId(authSubjectId);
    if (existing) {
      return toProvisioningResult(existing);
    }

    const role =
      authSubjectId === this.bootstrapCoachAuthSubjectId ? "COACH" : "USER";

    try {
      const inserted = await this.repository.insert({ authSubjectId, role });
      return toProvisioningResult(inserted);
    } catch (error) {
      // Another request may have inserted the same auth subject concurrently.
      // Re-reading lets both requests converge on the row that won, instead
      // of surfacing a database-shaped error to the caller.
      const wonByConcurrentInsert =
        await this.repository.findByAuthSubjectId(authSubjectId);
      if (!wonByConcurrentInsert) {
        throw error;
      }
      return toProvisioningResult(wonByConcurrentInsert);
    }
  }
}
