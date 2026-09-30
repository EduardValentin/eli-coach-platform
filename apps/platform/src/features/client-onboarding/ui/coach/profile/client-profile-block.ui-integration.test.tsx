// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ClientProfileView } from "~/features/client-onboarding/contracts/client-profile";

import { ClientProfileBlock } from "./client-profile-block";

const NOW = new Date("2026-03-13T23:30:00.000Z");

const PROFILE: ClientProfileView = {
  dateOfBirth: "1994-03-14",
  gender: "female",
  country: "RO",
  phone: "+40712345678",
  heightCm: 168,
  startingWeightKg: 64.5,
  currentWeightKg: 63.8,
  activityLevel: "Lightly active",
  primaryGoal: "Lose fat",
  dietaryRestrictions: "Vegetarian, Lactose",
  clientNotes: "I travel a lot.",
};

const LABELS = [
  "Age",
  "Gender",
  "Country",
  "Phone",
  "Height",
  "Starting weight",
  "Current weight",
  "Activity level",
  "Primary goal",
  "Dietary restrictions",
  "Client notes",
];

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
  it("reads her profile: age on the coach's calendar, identity, body facts, goal, restrictions and notes", () => {
    // arrange, act
    render(<ClientProfileBlock gender="female" profile={PROFILE} />);

    // assert
    const profile = screen.getByRole("region", { name: "Profile" });
    expect(readings(profile)).toEqual([
      ["Age", "32"],
      ["Gender", "Female"],
      ["Country", "Romania"],
      ["Phone", "+40712345678"],
      ["Height", "168 cm"],
      ["Starting weight", "64.5 kg"],
      ["Current weight", "63.8 kg"],
      ["Activity level", "Lightly active"],
      ["Primary goal", "Lose fat"],
      ["Dietary restrictions", "Vegetarian, Lactose"],
      ["Client notes", "I travel a lot."],
    ]);
    expect(
      within(profile).getByRole("link", { name: "+40712345678" }),
    ).toHaveAttribute("href", "tel:+40712345678");
    expect(within(profile).queryByText(/profile fills in/)).toBeNull();
  });

  it("shows a dash for every fact she has not given", () => {
    // arrange
    const sparse: ClientProfileView = {
      ...PROFILE,
      phone: null,
      heightCm: null,
      startingWeightKg: null,
      currentWeightKg: null,
      activityLevel: null,
      primaryGoal: null,
      clientNotes: null,
    };

    // act
    render(<ClientProfileBlock gender="female" profile={sparse} />);

    // assert
    const profile = screen.getByRole("region", { name: "Profile" });
    expect(readings(profile).slice(3)).toEqual([
      ["Phone", "—"],
      ["Height", "—"],
      ["Starting weight", "—"],
      ["Current weight", "—"],
      ["Activity level", "—"],
      ["Primary goal", "—"],
      ["Dietary restrictions", "Vegetarian, Lactose"],
      ["Client notes", "—"],
    ]);
    expect(within(profile).queryByRole("link")).toBeNull();
  });

  it.each([
    ["female", "Her profile fills in once she sends her onboarding."],
    ["male", "His profile fills in once he sends his onboarding."],
    [
      "prefer_not_to_say",
      "Their profile fills in once they send their onboarding.",
    ],
  ] as const)(
    "shows only dashes and says when a %s client's profile fills in before she sends her onboarding",
    (gender, pendingLine) => {
      // arrange, act
      render(<ClientProfileBlock gender={gender} profile={null} />);

      // assert
      const profile = screen.getByRole("region", { name: "Profile" });
      expect(within(profile).getByText(pendingLine)).toBeInTheDocument();
      expect(readings(profile)).toEqual(LABELS.map((label) => [label, "—"]));
    },
  );
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
