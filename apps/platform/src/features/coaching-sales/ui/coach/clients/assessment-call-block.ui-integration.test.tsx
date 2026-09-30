// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CoachClient } from "~/features/coaching-sales/contracts/coach-clients";

import { AssessmentCallBlock } from "./assessment-call-block";

const CLIENT: Pick<CoachClient, "assessmentCall" | "subscription"> = {
  assessmentCall: {
    notes: "Knee surgery two years ago.",
    primaryGoal: "build_strength",
    startsAt: "2026-03-01T21:30:00.000Z",
  },
  subscription: {
    bundleId: "3-months",
    months: 3,
    paidAt: "2026-03-03T09:00:00.000Z",
    tier: "regular",
    workStartsOn: null,
  },
};

beforeEach(() => {
  coachIsIn("Europe/Bucharest");
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("the client's assessment call block", () => {
  it("reads when her call was on the coach's clock, the goal she booked with, that she paid the regular price and her notes", () => {
    // arrange, act
    render(<AssessmentCallBlock client={CLIENT} />);

    // assert
    const call = screen.getByRole("region", { name: "Assessment call" });
    expect(readings(call)).toEqual([
      ["Call", "Sun, Mar 1 · 11:30 PM"],
      ["Primary goal", "Build strength"],
      ["Reduced price", "No"],
      ["Booking notes", "Knee surgery two years ago."],
    ]);
  });

  it("says yes when she paid the reduced price", () => {
    // arrange
    const reduced = {
      ...CLIENT,
      subscription: CLIENT.subscription && {
        ...CLIENT.subscription,
        tier: "reduced" as const,
      },
    };

    // act
    render(<AssessmentCallBlock client={reduced} />);

    // assert
    const call = screen.getByRole("region", { name: "Assessment call" });
    expect(Object.fromEntries(readings(call))["Reduced price"]).toBe("Yes");
  });

  it("shows a dash for notes she did not leave and a price without a subscription", () => {
    // arrange
    const sparse = {
      assessmentCall: { ...CLIENT.assessmentCall, notes: null },
      subscription: null,
    };

    // act
    render(<AssessmentCallBlock client={sparse} />);

    // assert
    const shown = Object.fromEntries(
      readings(screen.getByRole("region", { name: "Assessment call" })),
    );
    expect([shown["Reduced price"], shown["Booking notes"]]).toEqual([
      "—",
      "—",
    ]);
  });
});

function coachIsIn(timeZone: string) {
  const actual = new Intl.DateTimeFormat().resolvedOptions();

  vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
    ...actual,
    timeZone,
  });
}

function readings(region: HTMLElement): [string, string][] {
  return within(region)
    .getAllByRole("term")
    .map((term) => [
      term.textContent ?? "",
      term.nextElementSibling?.textContent ?? "",
    ]);
}
