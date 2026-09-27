import { describe, expect, it } from "vitest";

import type { CallSalesState } from "~/features/coaching-sales/contracts/coaching-sales";

import {
  countsBySalesFilter,
  matchesSalesFilter,
  toSalesFilter,
} from "./sales-status-filter";

type ListedCall = { id: string; state: CallSalesState | null };

const CALLS: readonly ListedCall[] = [
  { id: "upcoming", state: null },
  { id: "held-1", state: "held" },
  { id: "held-2", state: "held" },
  { id: "sent", state: "payment-link-sent" },
  { id: "paid", state: "paid" },
];

describe("reading the status filter from the URL", () => {
  it("keeps a status it knows and falls back to every status otherwise", () => {
    // arrange
    const raw = [null, "nonsense", "past", "held", "payment-link-sent", "paid"];

    // act
    const filters = raw.map(toSalesFilter);

    // assert
    expect(filters).toEqual([
      "any",
      "any",
      "any",
      "held",
      "payment-link-sent",
      "paid",
    ]);
  });
});

describe("matching a call against the status filter", () => {
  it("lets every call through while the filter asks for every status", () => {
    // arrange, act
    const matching = CALLS.filter((call) =>
      matchesSalesFilter("any", call.state),
    );

    // assert
    expect(matching).toHaveLength(CALLS.length);
  });

  it("keeps only the calls in the chosen state, never one without a state", () => {
    // arrange, act
    const matching = CALLS.filter((call) =>
      matchesSalesFilter("held", call.state),
    );

    // assert
    expect(matching.map((call) => call.id)).toEqual(["held-1", "held-2"]);
  });
});

describe("counting the calls under each status", () => {
  it("counts every call under All statuses and each ended call under its own state", () => {
    // arrange, act
    const counts = countsBySalesFilter(CALLS, (call) => call.state);

    // assert
    expect(counts).toEqual({
      any: 5,
      held: 2,
      "payment-link-sent": 1,
      paid: 1,
    });
  });

  it("counts nothing when no call is in view", () => {
    // arrange, act
    const counts = countsBySalesFilter([], (call: ListedCall) => call.state);

    // assert
    expect(counts).toEqual({
      any: 0,
      held: 0,
      "payment-link-sent": 0,
      paid: 0,
    });
  });
});
