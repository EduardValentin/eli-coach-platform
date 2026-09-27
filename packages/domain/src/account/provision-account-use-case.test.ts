import { describe, expect, it, vi } from "vitest";

import { Account } from "./account";
import type { Accounts } from "./accounts";
import type { InvitationAcceptance } from "./invitation-acceptance";
import { ProvisionAccountUseCase } from "./provision-account-use-case";

function buildAccount(
  overrides: Partial<Parameters<typeof Account.reconstitute>[0]> = {},
): Account {
  return Account.reconstitute({
    id: "account-1",
    authSubjectId: "auth-subject-1",
    role: "CLIENT",
    deletedAt: null,
    ...overrides,
  });
}

function acceptanceAnswering(
  outcome: "accepted" | "refused",
): InvitationAcceptance & { accept: ReturnType<typeof vi.fn> } {
  return { accept: vi.fn().mockResolvedValue(outcome) };
}

describe("ProvisionAccountUseCase", () => {
  it("rejects a subject with no account whose invitation is refused, without inserting one", async () => {
    // arrange
    const accounts: Accounts = {
      findByAuthSubjectId: vi.fn().mockResolvedValue(null),
      insert: vi.fn(),
      softDeleteByAuthSubjectId: vi.fn().mockResolvedValue(undefined),
    };
    const invitationAcceptance = acceptanceAnswering("refused");
    const useCase = new ProvisionAccountUseCase({
      accounts,
      invitationAcceptance,
      bootstrapCoachAuthSubjectId: "some-other-subject",
    });

    // act
    const result = await useCase.execute("auth-subject-1");

    // assert
    expect(result).toEqual({ outcome: "rejected-unprovisioned" });
    expect(invitationAcceptance.accept).toHaveBeenCalledWith({
      authSubjectId: "auth-subject-1",
    });
    expect(accounts.insert).not.toHaveBeenCalled();
  });

  it("inserts a CLIENT account for a subject whose invitation is accepted", async () => {
    // arrange
    const inserted = buildAccount({ role: "CLIENT" });
    const accounts: Accounts = {
      findByAuthSubjectId: vi.fn().mockResolvedValue(null),
      insert: vi.fn().mockResolvedValue(inserted),
      softDeleteByAuthSubjectId: vi.fn().mockResolvedValue(undefined),
    };
    const useCase = new ProvisionAccountUseCase({
      accounts,
      invitationAcceptance: acceptanceAnswering("accepted"),
      bootstrapCoachAuthSubjectId: "some-other-subject",
    });

    // act
    const result = await useCase.execute("auth-subject-1");

    // assert
    expect(result).toEqual({
      outcome: "active",
      account: inserted.toSnapshot(),
    });
    expect(accounts.insert).toHaveBeenCalledWith({
      authSubjectId: "auth-subject-1",
      role: "CLIENT",
    });
  });

  it("provisions the CLIENT account on the request after an accepted invitation whose account insert failed", async () => {
    // arrange
    const inserted = buildAccount({ role: "CLIENT" });
    const accounts: Accounts = {
      findByAuthSubjectId: vi.fn().mockResolvedValue(null),
      insert: vi
        .fn()
        .mockRejectedValueOnce(new Error("connection reset"))
        .mockResolvedValueOnce(inserted),
      softDeleteByAuthSubjectId: vi.fn().mockResolvedValue(undefined),
    };
    const invitationAcceptance = acceptanceAnswering("accepted");
    const useCase = new ProvisionAccountUseCase({
      accounts,
      invitationAcceptance,
    });
    await expect(useCase.execute("auth-subject-1")).rejects.toThrow(
      "connection reset",
    );

    // act
    const result = await useCase.execute("auth-subject-1");

    // assert
    expect(result).toEqual({
      outcome: "active",
      account: inserted.toSnapshot(),
    });
    expect(invitationAcceptance.accept).toHaveBeenCalledTimes(2);
  });

  it("re-reads and returns the CLIENT account when an admitted insert loses a race", async () => {
    // arrange
    const wonByConcurrentInsert = buildAccount({ role: "CLIENT" });
    const accounts: Accounts = {
      findByAuthSubjectId: vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(wonByConcurrentInsert),
      insert: vi
        .fn()
        .mockRejectedValue(
          Object.assign(new Error("duplicate key value"), { code: "23505" }),
        ),
      softDeleteByAuthSubjectId: vi.fn().mockResolvedValue(undefined),
    };
    const useCase = new ProvisionAccountUseCase({
      accounts,
      invitationAcceptance: acceptanceAnswering("accepted"),
    });

    // act
    const result = await useCase.execute("auth-subject-1");

    // assert
    expect(result).toEqual({
      outcome: "active",
      account: wonByConcurrentInsert.toSnapshot(),
    });
  });

  it("rejects a subject with no account when no bootstrap coach is configured", async () => {
    // arrange
    const accounts: Accounts = {
      findByAuthSubjectId: vi.fn().mockResolvedValue(null),
      insert: vi.fn(),
      softDeleteByAuthSubjectId: vi.fn().mockResolvedValue(undefined),
    };
    const useCase = new ProvisionAccountUseCase({
      accounts,
      invitationAcceptance: acceptanceAnswering("refused"),
    });

    // act
    const result = await useCase.execute("auth-subject-1");

    // assert
    expect(result).toEqual({ outcome: "rejected-unprovisioned" });
    expect(accounts.insert).not.toHaveBeenCalled();
  });

  it("inserts a new COACH account when the auth subject matches the bootstrap coach id", async () => {
    // arrange
    const inserted = buildAccount({ role: "COACH" });
    const accounts: Accounts = {
      findByAuthSubjectId: vi.fn().mockResolvedValue(null),
      insert: vi.fn().mockResolvedValue(inserted),
      softDeleteByAuthSubjectId: vi.fn().mockResolvedValue(undefined),
    };
    const invitationAcceptance = acceptanceAnswering("accepted");
    const useCase = new ProvisionAccountUseCase({
      accounts,
      invitationAcceptance,
      bootstrapCoachAuthSubjectId: "auth-subject-1",
    });

    // act
    const result = await useCase.execute("auth-subject-1");

    // assert
    expect(result).toEqual({
      outcome: "active",
      account: inserted.toSnapshot(),
    });
    expect(accounts.insert).toHaveBeenCalledWith({
      authSubjectId: "auth-subject-1",
      role: "COACH",
    });
    expect(invitationAcceptance.accept).not.toHaveBeenCalled();
  });

  it("returns an existing account without changing its role", async () => {
    // arrange
    const existing = buildAccount({ role: "COACH" });
    const accounts: Accounts = {
      findByAuthSubjectId: vi.fn().mockResolvedValue(existing),
      insert: vi.fn().mockResolvedValue(existing),
      softDeleteByAuthSubjectId: vi.fn().mockResolvedValue(undefined),
    };
    const invitationAcceptance = acceptanceAnswering("accepted");
    const useCase = new ProvisionAccountUseCase({
      accounts,
      invitationAcceptance,
      bootstrapCoachAuthSubjectId: "some-other-subject",
    });

    // act
    const result = await useCase.execute("auth-subject-1");

    // assert
    expect(result).toEqual({
      outcome: "active",
      account: existing.toSnapshot(),
    });
    expect(accounts.insert).not.toHaveBeenCalled();
    expect(invitationAcceptance.accept).not.toHaveBeenCalled();
  });

  it("rejects a soft-deleted account without inserting", async () => {
    // arrange
    const deleted = buildAccount({
      deletedAt: new Date("2026-01-01T00:00:00Z"),
    });
    const accounts: Accounts = {
      findByAuthSubjectId: vi.fn().mockResolvedValue(deleted),
      insert: vi.fn().mockResolvedValue(deleted),
      softDeleteByAuthSubjectId: vi.fn().mockResolvedValue(undefined),
    };
    const useCase = new ProvisionAccountUseCase({
      accounts,
      invitationAcceptance: acceptanceAnswering("refused"),
    });

    // act
    const result = await useCase.execute("auth-subject-1");

    // assert
    expect(result).toEqual({ outcome: "rejected-deleted" });
    expect(accounts.insert).not.toHaveBeenCalled();
  });

  it("re-reads and returns the existing account when insert loses a race", async () => {
    // arrange
    const wonByConcurrentInsert = buildAccount({ role: "COACH" });
    const uniqueViolation = Object.assign(
      new Error("duplicate key value violates unique constraint"),
      { code: "23505" },
    );
    const accounts: Accounts = {
      findByAuthSubjectId: vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(wonByConcurrentInsert),
      insert: vi.fn().mockRejectedValue(uniqueViolation),
      softDeleteByAuthSubjectId: vi.fn().mockResolvedValue(undefined),
    };
    const useCase = new ProvisionAccountUseCase({
      accounts,
      invitationAcceptance: acceptanceAnswering("refused"),
      bootstrapCoachAuthSubjectId: "auth-subject-1",
    });

    // act
    const result = await useCase.execute("auth-subject-1");

    // assert
    expect(result).toEqual({
      outcome: "active",
      account: wonByConcurrentInsert.toSnapshot(),
    });
    expect(accounts.findByAuthSubjectId).toHaveBeenCalledTimes(2);
  });

  it("rejects a soft-deleted account found via the race re-read", async () => {
    // arrange
    const deletedByConcurrentInsert = buildAccount({
      deletedAt: new Date("2026-01-01T00:00:00Z"),
    });
    const uniqueViolation = Object.assign(
      new Error("duplicate key value violates unique constraint"),
      { code: "23505" },
    );
    const accounts: Accounts = {
      findByAuthSubjectId: vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(deletedByConcurrentInsert),
      insert: vi.fn().mockRejectedValue(uniqueViolation),
      softDeleteByAuthSubjectId: vi.fn().mockResolvedValue(undefined),
    };
    const useCase = new ProvisionAccountUseCase({
      accounts,
      invitationAcceptance: acceptanceAnswering("refused"),
      bootstrapCoachAuthSubjectId: "auth-subject-1",
    });

    // act
    const result = await useCase.execute("auth-subject-1");

    // assert
    expect(result).toEqual({ outcome: "rejected-deleted" });
  });

  it("rethrows the original insert error when the re-read still finds nothing", async () => {
    // arrange
    const insertError = new Error("connection reset");
    const accounts: Accounts = {
      findByAuthSubjectId: vi.fn().mockResolvedValue(null),
      insert: vi.fn().mockRejectedValue(insertError),
      softDeleteByAuthSubjectId: vi.fn().mockResolvedValue(undefined),
    };
    const useCase = new ProvisionAccountUseCase({
      accounts,
      invitationAcceptance: acceptanceAnswering("refused"),
      bootstrapCoachAuthSubjectId: "auth-subject-1",
    });

    // act
    const outcome = useCase.execute("auth-subject-1");

    // assert
    await expect(outcome).rejects.toThrow(insertError);
  });
});
