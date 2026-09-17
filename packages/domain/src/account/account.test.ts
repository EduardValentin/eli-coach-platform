import { describe, expect, it } from "vitest";

import { Account } from "./account";

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

describe("Account#isActive", () => {
  it.each([
    [null, true],
    [new Date("2026-01-01T00:00:00Z"), false],
  ] as const)("with deletedAt %s is active: %s", (deletedAt, expected) => {
    // arrange
    const account = buildAccount({ deletedAt });

    // act
    const active = account.isActive();

    // assert
    expect(active).toBe(expected);
  });
});

describe("Account#toSnapshot", () => {
  it("drops the deletion marker", () => {
    // arrange
    const account = buildAccount({
      deletedAt: new Date("2026-01-01T00:00:00Z"),
    });

    // act
    const snapshot = account.toSnapshot();

    // assert
    expect(snapshot).toEqual({
      authSubjectId: "auth-subject-1",
      id: "account-1",
      role: "CLIENT",
    });
  });
});

describe("Account portal access", () => {
  it.each([
    ["CLIENT", true, false],
    ["COACH", false, true],
  ] as const)("%s role: client %s, coach %s", (role, client, coach) => {
    // arrange
    const snapshot = { role };

    // act
    const clientAccess = Account.canAccessClientPortal(snapshot);
    const coachAccess = Account.canAccessCoachPortal(snapshot);

    // assert
    expect(clientAccess).toBe(client);
    expect(coachAccess).toBe(coach);
  });
});
