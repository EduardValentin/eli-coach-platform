import type { Account, AccountRole, AccountSnapshot } from "./account";
import type { Accounts } from "./accounts";
import type { InvitationAcceptance } from "./invitation-acceptance";

export type ProvisionAccountResult =
  | { outcome: "active"; account: AccountSnapshot }
  | { outcome: "rejected-deleted" }
  | { outcome: "rejected-unprovisioned" };

type ProvisionAccountUseCaseOptions = {
  accounts: Accounts;
  bootstrapCoachAuthSubjectId?: string;
  invitationAcceptance: InvitationAcceptance;
};

function toProvisioningResult(account: Account): ProvisionAccountResult {
  return account.isActive()
    ? { outcome: "active", account: account.toSnapshot() }
    : { outcome: "rejected-deleted" };
}

export class ProvisionAccountUseCase {
  constructor(private readonly options: ProvisionAccountUseCaseOptions) {}

  async execute(authSubjectId: string): Promise<ProvisionAccountResult> {
    const existing =
      await this.options.accounts.findByAuthSubjectId(authSubjectId);
    if (existing) {
      return toProvisioningResult(existing);
    }

    const role = await this.admitSubject(authSubjectId);
    if (!role) {
      return { outcome: "rejected-unprovisioned" };
    }

    return this.insert({ authSubjectId, role });
  }

  private async admitSubject(
    authSubjectId: string,
  ): Promise<AccountRole | null> {
    if (authSubjectId === this.options.bootstrapCoachAuthSubjectId) {
      return "COACH";
    }

    const acceptance = await this.options.invitationAcceptance.accept({
      authSubjectId,
    });

    return acceptance === "accepted" ? "CLIENT" : null;
  }

  private async insert(input: {
    authSubjectId: string;
    role: AccountRole;
  }): Promise<ProvisionAccountResult> {
    try {
      return toProvisioningResult(await this.options.accounts.insert(input));
    } catch (error) {
      // Another request may have inserted the same auth subject concurrently.
      // Re-reading lets both requests converge on the row that won, instead
      // of surfacing a database-shaped error to the caller.
      const wonByConcurrentInsert =
        await this.options.accounts.findByAuthSubjectId(input.authSubjectId);
      if (!wonByConcurrentInsert) {
        throw error;
      }
      return toProvisioningResult(wonByConcurrentInsert);
    }
  }
}
