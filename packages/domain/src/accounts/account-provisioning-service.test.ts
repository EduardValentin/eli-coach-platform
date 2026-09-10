import { describe, expect, it, vi } from "vitest";

import {
  AccountProvisioningService,
  type Account,
  type AccountRepository,
} from "./index";

function buildAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: "account-1",
    authSubjectId: "auth-subject-1",
    role: "CLIENT",
    deletedAt: null,
    ...overrides,
  };
}

describe("AccountProvisioningService", () => {
  it("rejects a subject with no account without inserting one", async () => {
    // arrange
    const repository: AccountRepository = {
      findByAuthSubjectId: vi.fn().mockResolvedValue(null),
      insert: vi.fn(),
      softDeleteByAuthSubjectId: vi.fn().mockResolvedValue(undefined),
    };
    const service = new AccountProvisioningService({
      repository,
      bootstrapCoachAuthSubjectId: "some-other-subject",
    });

    // act
    const result = await service.ensureAccount("auth-subject-1");

    // assert
    expect(result).toEqual({ outcome: "rejected-unprovisioned" });
    expect(repository.insert).not.toHaveBeenCalled();
  });

  it("rejects a subject with no account when no bootstrap coach is configured", async () => {
    // arrange
    const repository: AccountRepository = {
      findByAuthSubjectId: vi.fn().mockResolvedValue(null),
      insert: vi.fn(),
      softDeleteByAuthSubjectId: vi.fn().mockResolvedValue(undefined),
    };
    const service = new AccountProvisioningService({ repository });

    // act
    const result = await service.ensureAccount("auth-subject-1");

    // assert
    expect(result).toEqual({ outcome: "rejected-unprovisioned" });
    expect(repository.insert).not.toHaveBeenCalled();
  });

  it("inserts a new COACH account when the auth subject matches the bootstrap coach id", async () => {
    // arrange
    const inserted = buildAccount({ role: "COACH" });
    const repository: AccountRepository = {
      findByAuthSubjectId: vi.fn().mockResolvedValue(null),
      insert: vi.fn().mockResolvedValue(inserted),
      softDeleteByAuthSubjectId: vi.fn().mockResolvedValue(undefined),
    };
    const service = new AccountProvisioningService({
      repository,
      bootstrapCoachAuthSubjectId: "auth-subject-1",
    });

    // act
    const result = await service.ensureAccount("auth-subject-1");

    // assert
    expect(result).toEqual({ outcome: "active", account: inserted });
    expect(repository.insert).toHaveBeenCalledWith({
      authSubjectId: "auth-subject-1",
      role: "COACH",
    });
  });

  it("returns an existing account without changing its role", async () => {
    // arrange
    const existing = buildAccount({ role: "COACH" });
    const repository: AccountRepository = {
      findByAuthSubjectId: vi.fn().mockResolvedValue(existing),
      insert: vi.fn().mockResolvedValue(existing),
      softDeleteByAuthSubjectId: vi.fn().mockResolvedValue(undefined),
    };
    const service = new AccountProvisioningService({
      repository,
      bootstrapCoachAuthSubjectId: "some-other-subject",
    });

    // act
    const result = await service.ensureAccount("auth-subject-1");

    // assert
    expect(result).toEqual({ outcome: "active", account: existing });
    expect(repository.insert).not.toHaveBeenCalled();
  });

  it("rejects a soft-deleted account without inserting", async () => {
    // arrange
    const deleted = buildAccount({ deletedAt: new Date("2026-01-01T00:00:00Z") });
    const repository: AccountRepository = {
      findByAuthSubjectId: vi.fn().mockResolvedValue(deleted),
      insert: vi.fn().mockResolvedValue(deleted),
      softDeleteByAuthSubjectId: vi.fn().mockResolvedValue(undefined),
    };
    const service = new AccountProvisioningService({ repository });

    // act
    const result = await service.ensureAccount("auth-subject-1");

    // assert
    expect(result).toEqual({ outcome: "rejected-deleted" });
    expect(repository.insert).not.toHaveBeenCalled();
  });

  it("re-reads and returns the existing account when insert loses a race", async () => {
    // arrange
    const wonByConcurrentInsert = buildAccount({ role: "COACH" });
    const uniqueViolation = Object.assign(
      new Error("duplicate key value violates unique constraint"),
      { code: "23505" },
    );
    const repository: AccountRepository = {
      findByAuthSubjectId: vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(wonByConcurrentInsert),
      insert: vi.fn().mockRejectedValue(uniqueViolation),
      softDeleteByAuthSubjectId: vi.fn().mockResolvedValue(undefined),
    };
    const service = new AccountProvisioningService({
      repository,
      bootstrapCoachAuthSubjectId: "auth-subject-1",
    });

    // act
    const result = await service.ensureAccount("auth-subject-1");

    // assert
    expect(result).toEqual({ outcome: "active", account: wonByConcurrentInsert });
    expect(repository.findByAuthSubjectId).toHaveBeenCalledTimes(2);
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
    const repository: AccountRepository = {
      findByAuthSubjectId: vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(deletedByConcurrentInsert),
      insert: vi.fn().mockRejectedValue(uniqueViolation),
      softDeleteByAuthSubjectId: vi.fn().mockResolvedValue(undefined),
    };
    const service = new AccountProvisioningService({
      repository,
      bootstrapCoachAuthSubjectId: "auth-subject-1",
    });

    // act
    const result = await service.ensureAccount("auth-subject-1");

    // assert
    expect(result).toEqual({ outcome: "rejected-deleted" });
  });

  it("rethrows the original insert error when the re-read still finds nothing", async () => {
    // arrange
    const insertError = new Error("connection reset");
    const repository: AccountRepository = {
      findByAuthSubjectId: vi.fn().mockResolvedValue(null),
      insert: vi.fn().mockRejectedValue(insertError),
      softDeleteByAuthSubjectId: vi.fn().mockResolvedValue(undefined),
    };
    const service = new AccountProvisioningService({
      repository,
      bootstrapCoachAuthSubjectId: "auth-subject-1",
    });

    // act
    const outcome = service.ensureAccount("auth-subject-1");

    // assert
    await expect(outcome).rejects.toThrow(insertError);
  });
});
