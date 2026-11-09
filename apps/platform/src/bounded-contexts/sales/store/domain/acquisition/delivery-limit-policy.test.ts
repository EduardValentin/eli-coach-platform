import { describe, expect, it } from "vitest";

import { STORE_DELIVERY_LIMIT_POLICY } from "./delivery-limit-policy";

describe("DeliveryLimitPolicy", () => {
  it.each([
    [{ cooldownCount: 1, dailyCount: 1 }, "cooldown"],
    [{ cooldownCount: 0, dailyCount: 10 }, "daily"],
    [{ cooldownCount: 0, dailyCount: 9 }, null],
  ])("limits usage %o to the %s window", (usage, expected) => {
    // arrange
    const policy = STORE_DELIVERY_LIMIT_POLICY;

    // act
    const window = policy.limitedWindow(usage);

    // assert
    expect(window).toBe(expected);
  });
});
