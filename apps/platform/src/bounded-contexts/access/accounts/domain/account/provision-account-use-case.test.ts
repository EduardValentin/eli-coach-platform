import { describe, expect, it, vi } from "vitest";

import { Account } from "./account";
import type { AccountIdsPort } from "./account-ids-port";
import type { AccountsPort } from "./accounts-port";
import type { AccountRole } from "./account";
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

const accountIdsPort: AccountIdsPort = { generate: () => "account-new" };

function gateAdmitting(role: AccountRole | null) {
  return {
    admit: vi
      .fn<(authSubjectId: string) => Promise<AccountRole | null>>()
      .mockResolvedValue(role),
  };
}

describe("ProvisionAccountUseCase", () => {
  it("rejects a subject with no account whose invitation is refused, without inserting one", async () => {
    // arrange
    const accountsPort: AccountsPort = {
      findByAuthSubjectId: vi.fn().mockResolvedValue(null),
      insert: vi.fn(),
      softDeleteByAuthSubjectId: vi.fn().mockResolvedValue(undefined),
    };
    const invitationGate = gateAdmitting(null);
    const provisionAccountUseCase = new ProvisionAccountUseCase({
      accountsPort,
      accountIdsPort,
      invitationGate,
      bootstrapCoachAuthSubjectId: "some-other-subject",
    });

    // act
    const result = await provisionAccountUseCase.execute("auth-subject-1");

    // assert
    expect(result).toEqual({ outcome: "rejected-unprovisioned" });
    expect(invitationGate.admit).toHaveBeenCalledWith("auth-subject-1");
    expect(accountsPort.insert).not.toHaveBeenCalled();
  });

  it("inserts a CLIENT account under a fresh id for a subject whose invitation is accepted", async () => {
    // arrange
    const accountsPort: AccountsPort = {
      findByAuthSubjectId: vi.fn().mockResolvedValue(null),
      insert: vi.fn().mockResolvedValue(undefined),
      softDeleteByAuthSubjectId: vi.fn().mockResolvedValue(undefined),
    };
    const provisionAccountUseCase = new ProvisionAccountUseCase({
      accountsPort,
      accountIdsPort,
      invitationGate: gateAdmitting("CLIENT"),
      bootstrapCoachAuthSubjectId: "some-other-subject",
    });

    // act
    const result = await provisionAccountUseCase.execute("auth-subject-1");

    // assert
    expect(result).toEqual({
      outcome: "active",
      account: {
        id: "account-new",
        authSubjectId: "auth-subject-1",
        role: "CLIENT",
      },
    });
    expect(accountsPort.insert).toHaveBeenCalledWith(
      Account.provisioned({
        id: "account-new",
        authSubjectId: "auth-subject-1",
        role: "CLIENT",
      }),
    );
  });

  it("provisions the CLIENT account on the request after an accepted invitation whose account insert failed", async () => {
    // arrange
    const accountsPort: AccountsPort = {
      findByAuthSubjectId: vi.fn().mockResolvedValue(null),
      insert: vi
        .fn()
        .mockRejectedValueOnce(new Error("connection reset"))
        .mockResolvedValueOnce(undefined),
      softDeleteByAuthSubjectId: vi.fn().mockResolvedValue(undefined),
    };
    const invitationGate = gateAdmitting("CLIENT");
    const provisionAccountUseCase = new ProvisionAccountUseCase({
      accountsPort,
      accountIdsPort,
      invitationGate,
    });
    await expect(
      provisionAccountUseCase.execute("auth-subject-1"),
    ).rejects.toThrow("connection reset");

    // act
    const result = await provisionAccountUseCase.execute("auth-subject-1");

    // assert
    expect(result).toEqual({
      outcome: "active",
      account: {
        id: "account-new",
        authSubjectId: "auth-subject-1",
        role: "CLIENT",
      },
    });
    expect(invitationGate.admit).toHaveBeenCalledTimes(2);
  });

  it("re-reads and returns the CLIENT account when an admitted insert loses a race", async () => {
    // arrange
    const wonByConcurrentInsert = buildAccount({ role: "CLIENT" });
    const accountsPort: AccountsPort = {
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
    const provisionAccountUseCase = new ProvisionAccountUseCase({
      accountsPort,
      accountIdsPort,
      invitationGate: gateAdmitting("CLIENT"),
    });

    // act
    const result = await provisionAccountUseCase.execute("auth-subject-1");

    // assert
    expect(result).toEqual({
      outcome: "active",
      account: wonByConcurrentInsert.toSnapshot(),
    });
  });

  it("rejects a subject with no account when no bootstrap coach is configured", async () => {
    // arrange
    const accountsPort: AccountsPort = {
      findByAuthSubjectId: vi.fn().mockResolvedValue(null),
      insert: vi.fn(),
      softDeleteByAuthSubjectId: vi.fn().mockResolvedValue(undefined),
    };
    const provisionAccountUseCase = new ProvisionAccountUseCase({
      accountsPort,
      accountIdsPort,
      invitationGate: gateAdmitting(null),
    });

    // act
    const result = await provisionAccountUseCase.execute("auth-subject-1");

    // assert
    expect(result).toEqual({ outcome: "rejected-unprovisioned" });
    expect(accountsPort.insert).not.toHaveBeenCalled();
  });

  it("inserts a new COACH account when the auth subject matches the bootstrap coach id", async () => {
    // arrange
    const accountsPort: AccountsPort = {
      findByAuthSubjectId: vi.fn().mockResolvedValue(null),
      insert: vi.fn().mockResolvedValue(undefined),
      softDeleteByAuthSubjectId: vi.fn().mockResolvedValue(undefined),
    };
    const invitationGate = gateAdmitting("CLIENT");
    const provisionAccountUseCase = new ProvisionAccountUseCase({
      accountsPort,
      accountIdsPort,
      invitationGate,
      bootstrapCoachAuthSubjectId: "auth-subject-1",
    });

    // act
    const result = await provisionAccountUseCase.execute("auth-subject-1");

    // assert
    expect(result).toEqual({
      outcome: "active",
      account: {
        id: "account-new",
        authSubjectId: "auth-subject-1",
        role: "COACH",
      },
    });
    expect(accountsPort.insert).toHaveBeenCalledWith(
      Account.provisioned({
        id: "account-new",
        authSubjectId: "auth-subject-1",
        role: "COACH",
      }),
    );
    expect(invitationGate.admit).not.toHaveBeenCalled();
  });

  it("returns an existing account without changing its role", async () => {
    // arrange
    const existing = buildAccount({ role: "COACH" });
    const accountsPort: AccountsPort = {
      findByAuthSubjectId: vi.fn().mockResolvedValue(existing),
      insert: vi.fn(),
      softDeleteByAuthSubjectId: vi.fn().mockResolvedValue(undefined),
    };
    const invitationGate = gateAdmitting("CLIENT");
    const provisionAccountUseCase = new ProvisionAccountUseCase({
      accountsPort,
      accountIdsPort,
      invitationGate,
      bootstrapCoachAuthSubjectId: "some-other-subject",
    });

    // act
    const result = await provisionAccountUseCase.execute("auth-subject-1");

    // assert
    expect(result).toEqual({
      outcome: "active",
      account: existing.toSnapshot(),
    });
    expect(accountsPort.insert).not.toHaveBeenCalled();
    expect(invitationGate.admit).not.toHaveBeenCalled();
  });

  it("rejects a soft-deleted account without inserting", async () => {
    // arrange
    const deleted = buildAccount({
      deletedAt: new Date("2026-01-01T00:00:00Z"),
    });
    const accountsPort: AccountsPort = {
      findByAuthSubjectId: vi.fn().mockResolvedValue(deleted),
      insert: vi.fn(),
      softDeleteByAuthSubjectId: vi.fn().mockResolvedValue(undefined),
    };
    const provisionAccountUseCase = new ProvisionAccountUseCase({
      accountsPort,
      accountIdsPort,
      invitationGate: gateAdmitting(null),
    });

    // act
    const result = await provisionAccountUseCase.execute("auth-subject-1");

    // assert
    expect(result).toEqual({ outcome: "rejected-deleted" });
    expect(accountsPort.insert).not.toHaveBeenCalled();
  });

  it("re-reads and returns the existing account when insert loses a race", async () => {
    // arrange
    const wonByConcurrentInsert = buildAccount({ role: "COACH" });
    const uniqueViolation = Object.assign(
      new Error("duplicate key value violates unique constraint"),
      { code: "23505" },
    );
    const accountsPort: AccountsPort = {
      findByAuthSubjectId: vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(wonByConcurrentInsert),
      insert: vi.fn().mockRejectedValue(uniqueViolation),
      softDeleteByAuthSubjectId: vi.fn().mockResolvedValue(undefined),
    };
    const provisionAccountUseCase = new ProvisionAccountUseCase({
      accountsPort,
      accountIdsPort,
      invitationGate: gateAdmitting(null),
      bootstrapCoachAuthSubjectId: "auth-subject-1",
    });

    // act
    const result = await provisionAccountUseCase.execute("auth-subject-1");

    // assert
    expect(result).toEqual({
      outcome: "active",
      account: wonByConcurrentInsert.toSnapshot(),
    });
    expect(accountsPort.findByAuthSubjectId).toHaveBeenCalledTimes(2);
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
    const accountsPort: AccountsPort = {
      findByAuthSubjectId: vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(deletedByConcurrentInsert),
      insert: vi.fn().mockRejectedValue(uniqueViolation),
      softDeleteByAuthSubjectId: vi.fn().mockResolvedValue(undefined),
    };
    const provisionAccountUseCase = new ProvisionAccountUseCase({
      accountsPort,
      accountIdsPort,
      invitationGate: gateAdmitting(null),
      bootstrapCoachAuthSubjectId: "auth-subject-1",
    });

    // act
    const result = await provisionAccountUseCase.execute("auth-subject-1");

    // assert
    expect(result).toEqual({ outcome: "rejected-deleted" });
  });

  it("rethrows the original insert error when the re-read still finds nothing", async () => {
    // arrange
    const insertError = new Error("connection reset");
    const accountsPort: AccountsPort = {
      findByAuthSubjectId: vi.fn().mockResolvedValue(null),
      insert: vi.fn().mockRejectedValue(insertError),
      softDeleteByAuthSubjectId: vi.fn().mockResolvedValue(undefined),
    };
    const provisionAccountUseCase = new ProvisionAccountUseCase({
      accountsPort,
      accountIdsPort,
      invitationGate: gateAdmitting(null),
      bootstrapCoachAuthSubjectId: "auth-subject-1",
    });

    // act
    const outcome = provisionAccountUseCase.execute("auth-subject-1");

    // assert
    await expect(outcome).rejects.toThrow(insertError);
  });
});
