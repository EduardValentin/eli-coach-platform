import type {
  AccountRepository,
  VerifiedEmailDirectory,
} from "../accounts";
import {
  normalizeStoreEmail,
  resolveDeliveryLimitKey,
} from "./store-acquisition-service";

/**
 * Claims Store recipients for an account. A recipient is claimed at most once
 * — the account it names first keeps it — which is what makes repeated
 * linking harmless and stops a later account created with the same address
 * from inheriting a deleted account's ownership.
 */
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

  /**
   * The directory arrives per call rather than through the constructor
   * because the identity provider's client is request-scoped: it resolves the
   * API it talks to from the request the caller is serving.
   */
  async linkPriorAcquisitions(command: {
    authSubjectId: string;
    verifiedEmailDirectory: VerifiedEmailDirectory;
  }): Promise<StoreOwnershipLinkingResult> {
    const account = await this.options.accountRepository.findByAuthSubjectId(
      command.authSubjectId,
    );

    // A deleted account keeps the recipients it already claimed, so its
    // ownership history survives; it just never claims anything more.
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
