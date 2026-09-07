import { describe, expect, it, vi } from "vitest";

import type {
  Account,
  AccountRepository,
  VerifiedEmailDirectory,
} from "../accounts";
import {
  StoreOwnershipLinkingService,
  type StoreRecipientOwnershipRepository,
} from "./index";

const AUTH_SUBJECT_ID = "user_2aBcDeFgHiJkLmNoPqRsTuVwXyZ";

function buildAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: "3f1d6b0e-2c5a-4a9f-8f2e-6d0b7c1a4e93",
    authSubjectId: AUTH_SUBJECT_ID,
    role: "USER",
    deletedAt: null,
    ...overrides,
  };
}

function buildAccountRepository(account: Account | null): AccountRepository {
  return {
    findByAuthSubjectId: vi.fn().mockResolvedValue(account),
    insert: vi.fn(),
    softDeleteByAuthSubjectId: vi.fn(),
  };
}

function buildVerifiedEmailDirectory(
  verifiedEmails: readonly string[],
): VerifiedEmailDirectory {
  return {
    listVerifiedEmails: vi.fn().mockResolvedValue(verifiedEmails),
  };
}

function buildOwnershipRepository(
  claimedRecipientCount: number,
): StoreRecipientOwnershipRepository {
  return {
    claimUnclaimedRecipients: vi
      .fn()
      .mockResolvedValue(claimedRecipientCount),
  };
}

describe("StoreOwnershipLinkingService", () => {
  it("claims the recipients every verified address shares an inbox with", async () => {
    // arrange
    const account = buildAccount();
    const ownershipRepository = buildOwnershipRepository(2);
    const service = new StoreOwnershipLinkingService({
      accountRepository: buildAccountRepository(account),
      ownershipRepository,
    });

    // act
    const result = await service.linkPriorAcquisitions({
      authSubjectId: AUTH_SUBJECT_ID,
      verifiedEmailDirectory: buildVerifiedEmailDirectory([
        "woman+guides@example.com",
        "second@example.com",
      ]),
    });

    // assert
    expect(result).toEqual({ status: "linked", claimedRecipientCount: 2 });
    expect(ownershipRepository.claimUnclaimedRecipients).toHaveBeenCalledWith({
      accountId: account.id,
      deliveryLimitKeys: ["woman@example.com", "second@example.com"],
    });
  });

  it("claims once for addresses that normalize onto the same inbox", async () => {
    // arrange
    const ownershipRepository = buildOwnershipRepository(1);
    const service = new StoreOwnershipLinkingService({
      accountRepository: buildAccountRepository(buildAccount()),
      ownershipRepository,
    });

    // act
    await service.linkPriorAcquisitions({
      authSubjectId: AUTH_SUBJECT_ID,
      verifiedEmailDirectory: buildVerifiedEmailDirectory([
        "  Woman@Example.com ",
        "woman+guides@example.com",
        "woman+recipes@example.com",
      ]),
    });

    // assert
    expect(ownershipRepository.claimUnclaimedRecipients).toHaveBeenCalledWith({
      accountId: buildAccount().id,
      deliveryLimitKeys: ["woman@example.com"],
    });
  });

  it("claims nothing for an auth subject that has no account yet", async () => {
    // arrange
    const ownershipRepository = buildOwnershipRepository(0);
    const verifiedEmailDirectory = buildVerifiedEmailDirectory([
      "woman@example.com",
    ]);
    const service = new StoreOwnershipLinkingService({
      accountRepository: buildAccountRepository(null),
      ownershipRepository,
    });

    // act
    const result = await service.linkPriorAcquisitions({
      authSubjectId: AUTH_SUBJECT_ID,
      verifiedEmailDirectory,
    });

    // assert
    expect(result).toEqual({ status: "skipped" });
    expect(verifiedEmailDirectory.listVerifiedEmails).not.toHaveBeenCalled();
    expect(
      ownershipRepository.claimUnclaimedRecipients,
    ).not.toHaveBeenCalled();
  });

  it("claims nothing for a deleted account, so a later account never inherits its ownership", async () => {
    // arrange
    const ownershipRepository = buildOwnershipRepository(0);
    const verifiedEmailDirectory = buildVerifiedEmailDirectory([
      "woman@example.com",
    ]);
    const service = new StoreOwnershipLinkingService({
      accountRepository: buildAccountRepository(
        buildAccount({ deletedAt: new Date("2026-08-30T09:00:00.000Z") }),
      ),
      ownershipRepository,
    });

    // act
    const result = await service.linkPriorAcquisitions({
      authSubjectId: AUTH_SUBJECT_ID,
      verifiedEmailDirectory,
    });

    // assert
    expect(result).toEqual({ status: "skipped" });
    expect(verifiedEmailDirectory.listVerifiedEmails).not.toHaveBeenCalled();
    expect(
      ownershipRepository.claimUnclaimedRecipients,
    ).not.toHaveBeenCalled();
  });

  it("claims nothing for an identity that carries no verified address", async () => {
    // arrange
    const ownershipRepository = buildOwnershipRepository(0);
    const service = new StoreOwnershipLinkingService({
      accountRepository: buildAccountRepository(buildAccount()),
      ownershipRepository,
    });

    // act
    const result = await service.linkPriorAcquisitions({
      authSubjectId: AUTH_SUBJECT_ID,
      verifiedEmailDirectory: buildVerifiedEmailDirectory([]),
    });

    // assert
    expect(result).toEqual({ status: "skipped" });
    expect(
      ownershipRepository.claimUnclaimedRecipients,
    ).not.toHaveBeenCalled();
  });

  it("reports a claim that matched no unclaimed recipient", async () => {
    // arrange
    const service = new StoreOwnershipLinkingService({
      accountRepository: buildAccountRepository(buildAccount()),
      ownershipRepository: buildOwnershipRepository(0),
    });

    // act
    const result = await service.linkPriorAcquisitions({
      authSubjectId: AUTH_SUBJECT_ID,
      verifiedEmailDirectory: buildVerifiedEmailDirectory([
        "woman@example.com",
      ]),
    });

    // assert
    expect(result).toEqual({ status: "linked", claimedRecipientCount: 0 });
  });
});
