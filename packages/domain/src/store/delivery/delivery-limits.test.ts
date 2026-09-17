import { describe, expect, it } from "vitest";

import {
  evaluateDeliveryLimit,
  resolveDeliveryWindows,
  STORE_DELIVERY_LIMIT_POLICY,
} from "./delivery-limits";

describe("resolveDeliveryWindows", () => {
  it("derives the cooldown, daily window and grant expiry from the request time", () => {
    // arrange
    const requestedAt = new Date("2026-07-30T12:00:00.000Z");

    // act
    const windows = resolveDeliveryWindows(
      requestedAt,
      STORE_DELIVERY_LIMIT_POLICY,
    );

    // assert
    expect(windows).toEqual({
      cooldownSince: new Date("2026-07-30T11:59:00.000Z"),
      dailyWindowSince: new Date("2026-07-29T12:00:00.000Z"),
      expiresAt: new Date("2026-08-06T12:00:00.000Z"),
    });
  });
});

describe("evaluateDeliveryLimit", () => {
  it.each([
    [{ cooldownCount: 1, dailyCount: 1 }, "cooldown"],
    [{ cooldownCount: 0, dailyCount: 10 }, "daily"],
    [{ cooldownCount: 0, dailyCount: 9 }, null],
  ])("decides %o as %s", (usage, expected) => {
    // arrange
    const dailyLimit = 10;

    // act
    const window = evaluateDeliveryLimit(usage, dailyLimit);

    // assert
    expect(window).toBe(expected);
  });
});
