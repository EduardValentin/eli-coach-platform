import { Account, type AccountRole, type AccountSnapshot } from "./account";
import type { AccountIdsPort } from "./account-ids-port";
import type { AccountsPort } from "./accounts-port";
import type { AccountInvitationGate } from "./account-invitation-gate";

export type ProvisionAccountResult =
  | { outcome: "active"; account: AccountSnapshot }
  | { outcome: "rejected-deleted" }
  | { outcome: "rejected-unprovisioned" };

type ProvisionAccountUseCaseOptions = {
  accountsPort: AccountsPort;
  accountIdsPort: AccountIdsPort;
  bootstrapCoachAuthSubjectId?: string;
  invitationGate: Pick<AccountInvitationGate, "admit">;
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
      await this.options.accountsPort.findByAuthSubjectId(authSubjectId);
    if (existing) {
      return toProvisioningResult(existing);
    }

    const role = await this.admitSubject(authSubjectId);
    if (!role) {
      return { outcome: "rejected-unprovisioned" };
    }

    return this.insert(
      Account.provisioned({
        id: this.options.accountIdsPort.generate(),
        authSubjectId,
        role,
      }),
    );
  }

  private async admitSubject(
    authSubjectId: string,
  ): Promise<AccountRole | null> {
    if (authSubjectId === this.options.bootstrapCoachAuthSubjectId) {
      return "COACH";
    }

    return this.options.invitationGate.admit(authSubjectId);
  }

  private async insert(account: Account): Promise<ProvisionAccountResult> {
    try {
      await this.options.accountsPort.insert(account);

      return toProvisioningResult(account);
    } catch (error) {
      // Another request may have inserted the same auth subject concurrently.
      // Re-reading lets both requests converge on the row that won, instead
      // of surfacing a database-shaped error to the caller.
      const wonByConcurrentInsert =
        await this.options.accountsPort.findByAuthSubjectId(
          account.authSubjectId,
        );
      if (!wonByConcurrentInsert) {
        throw error;
      }
      return toProvisioningResult(wonByConcurrentInsert);
    }
  }
}
