// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ClientSubscription } from "~/features/coaching-sales/contracts/coach-clients";

import { SubscriptionSummary } from "./subscription-summary";

const ENDED_ON = "2026-10-05T21:30:00.000Z";

const FULL_REFUND_REASON =
  "Full refund: cancelled within the 14-day withdrawal period.";

const SUBSCRIPTION: ClientSubscription = {
  bundleId: "6-months",
  months: 6,
  paidAt: "2026-09-30T22:30:00.000Z",
  reducedPrice: false,
  workStartsOn: null,
  status: "not-started",
  endsOn: null,
  endedOn: null,
  refund: null,
};

const REFUND_DUE: NonNullable<ClientSubscription["refund"]> = {
  reason: "full-refund",
  amountCents: 44700,
  outstandingCents: 44700,
  refundedCents: 0,
  currency: "eur",
  dueBy: "2026-10-19T21:30:00.000Z",
  refundedOn: null,
};

const ENDED_WITH_REFUND_DUE: ClientSubscription = {
  ...SUBSCRIPTION,
  status: "ended",
  endedOn: ENDED_ON,
  refund: REFUND_DUE,
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
    render(<SubscriptionSummary gender="female" subscription={SUBSCRIPTION} />);

    // assert
    expect(
      readings(screen.getByRole("region", { name: "Subscription" })),
    ).toEqual({
      Bundle: "6 months",
      "Payment date": "1 October",
      "Renews on": "Starts when her program is delivered",
      Start: "Immediate start",
      "Start program": "—",
      "Reduced price": "No",
    });
  });

  it("says yes when she paid the reduced price, as the last reading after renewal", () => {
    // arrange
    const reduced = { ...SUBSCRIPTION, reducedPrice: true };

    // act
    render(<SubscriptionSummary gender="female" subscription={reduced} />);

    // assert
    const shown = readings(
      screen.getByRole("region", { name: "Subscription" }),
    );
    expect(shown["Reduced price"]).toBe("Yes");
    expect(Object.keys(shown).slice(-2)).toEqual([
      "Renews on",
      "Reduced price",
    ]);
  });

  it("names the day work starts when she keeps her 14 days", () => {
    // arrange
    const waiting = {
      ...SUBSCRIPTION,
      workStartsOn: "2026-10-14T22:30:00.000Z",
    };

    // act
    render(<SubscriptionSummary gender="female" subscription={waiting} />);

    // assert
    expect(
      readings(screen.getByRole("region", { name: "Subscription" })).Start,
    ).toBe("After the 14 days (15 October)");
  });

  it("says renewal waits on his program for a man", () => {
    // arrange, act
    render(<SubscriptionSummary gender="male" subscription={SUBSCRIPTION} />);

    // assert
    expect(
      readings(screen.getByRole("region", { name: "Subscription" }))[
        "Renews on"
      ],
    ).toBe("Starts when his program is delivered");
  });

  it("says renewal waits on their program for a client who preferred not to say", () => {
    // arrange, act
    render(
      <SubscriptionSummary
        gender="prefer_not_to_say"
        subscription={SUBSCRIPTION}
      />,
    );

    // assert
    expect(
      readings(screen.getByRole("region", { name: "Subscription" }))[
        "Renews on"
      ],
    ).toBe("Starts when their program is delivered");
  });
});

describe("the subscription summary once her coaching is cancelled or ended", () => {
  it("reads when a cancelled subscription ends in place of the renewal", () => {
    // arrange
    const cancelled: ClientSubscription = {
      ...SUBSCRIPTION,
      status: "cancelled",
      endsOn: "2027-03-31T21:30:00.000Z",
    };

    // act
    render(<SubscriptionSummary gender="female" subscription={cancelled} />);

    // assert
    const shown = readings(
      screen.getByRole("region", { name: "Subscription" }),
    );
    expect(shown["Ends on"]).toBe("1 April");
    expect(shown).not.toHaveProperty("Renews on");
    expect(shown).not.toHaveProperty("Refund due");
  });

  it("reads when an ended subscription ended", () => {
    // arrange
    const ended: ClientSubscription = {
      ...SUBSCRIPTION,
      status: "ended",
      endedOn: ENDED_ON,
    };

    // act
    render(<SubscriptionSummary gender="female" subscription={ended} />);

    // assert
    const shown = readings(
      screen.getByRole("region", { name: "Subscription" }),
    );
    expect(shown["Ended on"]).toBe("6 October");
    expect(shown).not.toHaveProperty("Renews on");
  });

  it("reads the refund still due with its deadline and the reason under it, after the reduced price", () => {
    // arrange, act
    render(
      <SubscriptionSummary
        gender="female"
        subscription={ENDED_WITH_REFUND_DUE}
      />,
    );

    // assert
    const region = screen.getByRole("region", { name: "Subscription" });
    const shown = readings(region);
    expect(shown["Refund due"]).toBe("€447 by 20 October");
    expect(detailOf(region, "Refund due")).toBe(FULL_REFUND_REASON);
    expect(Object.keys(shown).slice(-2)).toEqual([
      "Reduced price",
      "Refund due",
    ]);
  });

  it("reads only what is still due once part of the refund reached her, and says how much already did", () => {
    // arrange
    const partRefunded: ClientSubscription = {
      ...ENDED_WITH_REFUND_DUE,
      refund: {
        ...REFUND_DUE,
        outstandingCents: 29800,
        refundedCents: 14900,
      },
    };

    // act
    render(<SubscriptionSummary gender="female" subscription={partRefunded} />);

    // assert
    const region = screen.getByRole("region", { name: "Subscription" });
    expect(readings(region)["Refund due"]).toBe("€298 by 20 October");
    expect(detailOf(region, "Refund due")).toBe(
      `${FULL_REFUND_REASON} €149 refunded so far.`,
    );
  });

  it("reads cents only when the amount has them", () => {
    // arrange
    const withCents: ClientSubscription = {
      ...ENDED_WITH_REFUND_DUE,
      refund: {
        ...REFUND_DUE,
        outstandingCents: 14833,
        refundedCents: 29867,
      },
    };

    // act
    render(<SubscriptionSummary gender="female" subscription={withCents} />);

    // assert
    const region = screen.getByRole("region", { name: "Subscription" });
    expect(readings(region)["Refund due"]).toBe("€148.33 by 20 October");
    expect(detailOf(region, "Refund due")).toBe(
      `${FULL_REFUND_REASON} €298.67 refunded so far.`,
    );
  });

  it("reads the day the refund was settled in place of what was due", () => {
    // arrange
    const refunded: ClientSubscription = {
      ...ENDED_WITH_REFUND_DUE,
      refund: {
        ...REFUND_DUE,
        outstandingCents: 0,
        refundedCents: 44700,
        refundedOn: "2026-10-08T21:30:00.000Z",
      },
    };

    // act
    render(<SubscriptionSummary gender="female" subscription={refunded} />);

    // assert
    const region = screen.getByRole("region", { name: "Subscription" });
    const shown = readings(region);
    expect(shown.Refunded).toBe("9 October");
    expect(shown).not.toHaveProperty("Refund due");
    expect(detailOf(region, "Refunded")).toBeNull();
  });
});

function detailOf(region: HTMLElement, label: string): string | null {
  const term = within(region)
    .getAllByRole("term")
    .find((candidate) => candidate.textContent === label);
  const detail = term?.nextElementSibling?.nextElementSibling;

  return detail?.textContent ?? null;
}

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
