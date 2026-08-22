import { describe, expect, it } from "vitest";

import { Account } from "./account";

describe("Account", () => {
  const snapshot = {
    id: "11111111-1111-1111-1111-111111111111",
    authSubjectId: "user_abc",
    role: "USER" as const,
    deleted: false,
  };

  it.each([
    ["USER", null],
    ["CLIENT", "client"],
    ["COACH", "coach"],
  ] as const)("gives a %s access to the %s portal", (role, portal) => {
    // arrange
    const account = Account.fromSnapshot({ ...snapshot, role });

    // act
    const reachable = account.reachablePortal();

    // assert
    expect(reachable).toBe(portal);
  });

  it("keeps a general user out of both portals", () => {
    // arrange
    const account = Account.fromSnapshot(snapshot);

    // act
    // assert
    expect(account.canReach("client")).toBe(false);
    expect(account.canReach("coach")).toBe(false);
  });

  it("keeps a client out of the coach portal", () => {
    // arrange
    const account = Account.fromSnapshot({ ...snapshot, role: "CLIENT" });

    // act
    // assert
    expect(account.canReach("client")).toBe(true);
    expect(account.canReach("coach")).toBe(false);
  });
});
