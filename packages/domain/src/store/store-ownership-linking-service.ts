import type {
  AccountRepository,
  VerifiedEmailDirectory,
} from "../accounts";
import {
  normalizeStoreEmail,
  resolveDeliveryLimitKey,
} from "./store-acquisition-service";

/** A recipient is claimed at most once; the account that claims it keeps it. */
export interface StoreRecipientOwnershipRepository {
  claimUnclaimedRecipients(command: {
    accountId: string;
    deliveryLimitKeys: readonly string[];
  }): Promise<number>;
}

export type StoreOwnershipLinkingResult =
  | { status: "linked"; claimedRecipientCount: number }
  | { status: "skipped" };

type StoreOwnershipLinkingServiceOptions = {
  accountRepository: AccountRepository;
  ownershipRepository: StoreRecipientOwnershipRepository;
};

export class StoreOwnershipLinkingService {
  constructor(
    private readonly options: StoreOwnershipLinkingServiceOptions,
  ) {}

  /** The directory arrives per call because the provider's client is request-scoped. */
  async linkPriorAcquisitions(command: {
    authSubjectId: string;
    verifiedEmailDirectory: VerifiedEmailDirectory;
  }): Promise<StoreOwnershipLinkingResult> {
    const account = await this.options.accountRepository.findByAuthSubjectId(
      command.authSubjectId,
    );

    // A deleted account keeps what it claimed, but never claims more.
    if (!account || account.deletedAt) {
      return { status: "skipped" };
    }

    const verifiedEmails =
      await command.verifiedEmailDirectory.listVerifiedEmails(
        command.authSubjectId,
      );
    const deliveryLimitKeys = [
      ...new Set(
        verifiedEmails.map((email) =>
          resolveDeliveryLimitKey(normalizeStoreEmail(email)),
        ),
      ),
    ];

    if (deliveryLimitKeys.length === 0) {
      return { status: "skipped" };
    }

    const claimedRecipientCount =
      await this.options.ownershipRepository.claimUnclaimedRecipients({
        accountId: account.id,
        deliveryLimitKeys,
      });

    return { status: "linked", claimedRecipientCount };
  }
}
