// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ClientSubscription } from "~/features/coaching-sales/contracts/coach-clients";

import { SubscriptionSummary } from "./subscription-summary";

const SUBSCRIPTION: ClientSubscription = {
  bundleId: "6-months",
  months: 6,
  paidAt: "2026-09-30T22:30:00.000Z",
  tier: "regular",
  workStartsOn: null,
};

beforeEach(() => {
  coachIsIn("Europe/Bucharest");
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("the subscription summary the coach reads", () => {
  it("reads the bundle, the payment day on her calendar and an immediate start before the program", () => {
    // arrange, act
    render(<SubscriptionSummary subscription={SUBSCRIPTION} />);

    // assert
    expect(
      readings(screen.getByRole("region", { name: "Subscription" })),
    ).toEqual({
      Bundle: "6 months",
      "Payment date": "1 October",
      "Renews on": "Once her program starts",
      Start: "Immediate start",
      "Start program": "—",
    });
  });

  it("names the day work starts when she keeps her 14 days", () => {
    // arrange
    const waiting = {
      ...SUBSCRIPTION,
      workStartsOn: "2026-10-14T22:30:00.000Z",
    };

    // act
    render(<SubscriptionSummary subscription={waiting} />);

    // assert
    expect(
      readings(screen.getByRole("region", { name: "Subscription" })).Start,
    ).toBe("After the 14 days (15 October)");
  });
});

function coachIsIn(timeZone: string) {
  const actual = new Intl.DateTimeFormat().resolvedOptions();

  vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
    ...actual,
    timeZone,
  });
}

function readings(region: HTMLElement): Record<string, string> {
  return Object.fromEntries(
    within(region)
      .getAllByRole("term")
      .map((term) => [
        term.textContent ?? "",
        term.nextElementSibling?.textContent ?? "",
      ]),
  );
}
