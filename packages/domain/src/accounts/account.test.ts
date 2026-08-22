import { describe, expect, it } from "vitest";

import { Account } from "./account";

describe("Account", () => {
  const snapshot = {
    id: "11111111-1111-1111-1111-111111111111",
    role: "USER" as const,
    deleted: false,
  };

  it.each([
    ["USER", "client", false],
    ["USER", "coach", false],
    ["CLIENT", "client", true],
    ["CLIENT", "coach", false],
    ["COACH", "coach", true],
    ["COACH", "client", false],
  ] as const)("a %s reaching the %s portal is %s", (role, portal, allowed) => {
    // arrange
    const account = Account.fromSnapshot({ ...snapshot, role });

    // act
    const reachable = account.canReach(portal);

    // assert
    expect(reachable).toBe(allowed);
  });
});
