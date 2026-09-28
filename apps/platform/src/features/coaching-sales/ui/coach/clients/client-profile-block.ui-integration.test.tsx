// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CoachClient } from "~/features/coaching-sales/contracts/coach-clients";

import { ClientProfileBlock } from "./client-profile-block";

const NOW = new Date("2026-03-13T23:30:00.000Z");

const CLIENT: Pick<CoachClient, "profile" | "subscription"> = {
  profile: {
    bookingNotes: "Knee surgery two years ago.",
    country: "RO",
    dateOfBirth: "1994-03-14",
    gender: "female",
    phone: "+40712345678",
    primaryGoal: "build_strength",
  },
  subscription: {
    bundleId: "3-months",
    months: 3,
    paidAt: "2026-03-01T09:00:00.000Z",
    tier: "reduced",
    workStartsOn: null,
  },
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  coachIsIn("Europe/Bucharest");
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("the client's profile block", () => {
  it("reads her age on the coach's calendar, her gender, country, phone, goal, tier and notes", () => {
    // arrange, act
    render(<ClientProfileBlock client={CLIENT} />);

    // assert
    const profile = screen.getByRole("region", { name: "Profile" });
    expect(readings(profile)).toEqual({
      Age: "32",
      "Booking notes": "Knee surgery two years ago.",
      Country: "Romania",
      Gender: "Female",
      Phone: "+40712345678",
      "Pricing tier": "Reduced",
      "Primary goal": "Build strength",
    });
    expect(
      within(profile).getByRole("link", { name: "+40712345678" }),
    ).toHaveAttribute("href", "tel:+40712345678");
  });

  it("shows a dash for what she has not given and the tier without a subscription", () => {
    // arrange
    const sparse = {
      profile: { ...CLIENT.profile, bookingNotes: null, phone: null },
      subscription: null,
    };

    // act
    render(<ClientProfileBlock client={sparse} />);

    // assert
    const shown = readings(screen.getByRole("region", { name: "Profile" }));
    expect([
      shown.Phone,
      shown["Pricing tier"],
      shown["Booking notes"],
    ]).toEqual(["—", "—", "—"]);
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
