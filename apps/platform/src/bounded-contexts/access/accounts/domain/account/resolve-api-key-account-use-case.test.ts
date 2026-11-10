import { describe, expect, it, vi } from "vitest";

import { Account } from "./account";
import type { AccountsPort } from "./accounts-port";
import type { ApiKeyVerifierPort } from "./api-key-verifier-port";
import { ResolveApiKeyAccountUseCase } from "./resolve-api-key-account-use-case";

const KEY_SECRET = "ak_coach_secret";

function accountsPortFinding(account: Account | null): AccountsPort {
  return {
    findByAuthSubjectId: vi.fn().mockResolvedValue(account),
    insert: vi.fn(),
    softDeleteByAuthSubjectId: vi.fn(),
  };
}

function apiKeyVerifierPortAnswering(
  authSubjectId: string | null,
): ApiKeyVerifierPort {
  return {
    verify: vi
      .fn()
      .mockResolvedValue(authSubjectId === null ? null : { authSubjectId }),
  };
}

function coachAccount(deletedAt: Date | null = null): Account {
  return Account.reconstitute({
    id: "account-coach",
    authSubjectId: "user_coach",
    role: "COACH",
    deletedAt,
  });
}

describe("ResolveApiKeyAccountUseCase", () => {
  it("resolves the account of the user a valid key was issued to", async () => {
    // arrange
    const accountsPort = accountsPortFinding(coachAccount());
    const apiKeyVerifierPort = apiKeyVerifierPortAnswering("user_coach");
    const resolveApiKeyAccountUseCase = new ResolveApiKeyAccountUseCase({
      accountsPort,
      apiKeyVerifierPort,
    });

    // act
    const result = await resolveApiKeyAccountUseCase.execute(
      `Bearer ${KEY_SECRET}`,
    );

    // assert
    expect(result).toEqual({
      status: "resolved",
      account: {
        authSubjectId: "user_coach",
        id: "account-coach",
        role: "COACH",
      },
    });
    expect(apiKeyVerifierPort.verify).toHaveBeenCalledWith(KEY_SECRET);
    expect(accountsPort.findByAuthSubjectId).toHaveBeenCalledWith("user_coach");
  });

  it("accepts the scheme case-insensitively, as HTTP defines it", async () => {
    // arrange
    const apiKeyVerifierPort = apiKeyVerifierPortAnswering("user_coach");
    const resolveApiKeyAccountUseCase = new ResolveApiKeyAccountUseCase({
      accountsPort: accountsPortFinding(coachAccount()),
      apiKeyVerifierPort,
    });

    // act
    const result = await resolveApiKeyAccountUseCase.execute(
      `bearer ${KEY_SECRET}`,
    );

    // assert
    expect(result).toMatchObject({ status: "resolved" });
    expect(apiKeyVerifierPort.verify).toHaveBeenCalledWith(KEY_SECRET);
  });

  it.each([
    ["no header", null],
    ["an empty header", ""],
    ["an empty credential", "Bearer "],
    ["another scheme", `Basic ${KEY_SECRET}`],
    ["a bare credential with no scheme", KEY_SECRET],
  ])(
    "answers invalid for %s without asking the verifier",
    async (_label, authorizationHeader) => {
      // arrange
      const apiKeyVerifierPort = apiKeyVerifierPortAnswering("user_coach");
      const resolveApiKeyAccountUseCase = new ResolveApiKeyAccountUseCase({
        accountsPort: accountsPortFinding(coachAccount()),
        apiKeyVerifierPort,
      });

      // act
      const result =
        await resolveApiKeyAccountUseCase.execute(authorizationHeader);

      // assert
      expect(result).toEqual({ status: "invalid" });
      expect(apiKeyVerifierPort.verify).not.toHaveBeenCalled();
    },
  );

  it("answers invalid for a key the verifier does not recognise", async () => {
    // arrange
    const accountsPort = accountsPortFinding(coachAccount());
    const resolveApiKeyAccountUseCase = new ResolveApiKeyAccountUseCase({
      accountsPort,
      apiKeyVerifierPort: apiKeyVerifierPortAnswering(null),
    });

    // act
    const result =
      await resolveApiKeyAccountUseCase.execute("Bearer ak_unknown");

    // assert
    expect(result).toEqual({ status: "invalid" });
    expect(accountsPort.findByAuthSubjectId).not.toHaveBeenCalled();
  });

  it("answers unavailable when the verifier cannot answer", async () => {
    // arrange
    const resolveApiKeyAccountUseCase = new ResolveApiKeyAccountUseCase({
      accountsPort: accountsPortFinding(coachAccount()),
      apiKeyVerifierPort: {
        verify: vi.fn().mockRejectedValue(new Error("Clerk is unreachable")),
      },
    });

    // act
    const result = await resolveApiKeyAccountUseCase.execute(
      `Bearer ${KEY_SECRET}`,
    );

    // assert
    expect(result).toEqual({ status: "unavailable" });
  });

  it.each([
    ["has never signed in", null],
    ["was deleted", coachAccount(new Date("2026-11-01T00:00:00Z"))],
  ])(
    "answers unprovisioned for a valid key whose user %s, and never creates an account",
    async (_label, account) => {
      // arrange
      const accountsPort = accountsPortFinding(account);
      const resolveApiKeyAccountUseCase = new ResolveApiKeyAccountUseCase({
        accountsPort,
        apiKeyVerifierPort: apiKeyVerifierPortAnswering("user_coach"),
      });

      // act
      const result = await resolveApiKeyAccountUseCase.execute(
        `Bearer ${KEY_SECRET}`,
      );

      // assert
      expect(result).toEqual({ status: "unprovisioned" });
      expect(accountsPort.insert).not.toHaveBeenCalled();
    },
  );
});
