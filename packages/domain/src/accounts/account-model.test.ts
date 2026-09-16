import { describe, expect, it } from "vitest";

import { isActiveAccount, toAccountSnapshot, type Account } from "./account-model";

function buildAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: "account-1",
    authSubjectId: "auth-subject-1",
    role: "CLIENT",
    deletedAt: null,
    ...overrides,
  };
}

describe("isActiveAccount", () => {
  it.each([
    [null, true],
    [new Date("2026-01-01T00:00:00Z"), false],
  ] as const)("returns %s as active: %s", (deletedAt, expected) => {
    // arrange
    const account = buildAccount({ deletedAt });

    // act
    const active = isActiveAccount(account);

    // assert
    expect(active).toBe(expected);
  });
});

describe("toAccountSnapshot", () => {
  it("drops deletedAt from the account", () => {
    // arrange
    const account = buildAccount({ deletedAt: new Date("2026-01-01T00:00:00Z") });

    // act
    const snapshot = toAccountSnapshot(account);

    // assert
    expect(snapshot).toEqual({
      authSubjectId: "auth-subject-1",
      id: "account-1",
      role: "CLIENT",
    });
  });
});
