// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ClientProfileView } from "~/features/client-profile/public/client-profile";

import { ClientProfileBlock } from "./client-profile-block";

const NOW = new Date("2026-03-13T23:30:00.000Z");

const IDENTITY: ClientProfileView["identity"] = {
  dateOfBirth: "1994-03-14",
  gender: "female",
  country: "RO",
  phone: "+40712345678",
};

const PROFILE: ClientProfileView = {
  identity: IDENTITY,
  facts: {
    heightCm: 168,
    activityLevel: "Lightly active",
    primaryGoal: "Lose fat",
    dietaryRestrictions: "Vegetarian, Lactose",
    clientNotes: "I travel a lot.",
  },
  startingWeightKg: 64.5,
  currentWeightKg: 63.8,
};

const AWAITING_ONBOARDING: ClientProfileView = {
  identity: IDENTITY,
  facts: null,
  startingWeightKg: null,
  currentWeightKg: null,
};

const ONBOARDING_LABELS = [
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
  it("reads her profile: age on the coach's calendar with her date of birth, identity, height, first and latest weights, goal, restrictions and notes", () => {
    // arrange, act
    render(<ClientProfileBlock profile={PROFILE} />);

    // assert
    const profile = screen.getByRole("region", { name: "Profile" });
    expect(readings(profile)).toEqual([
      ["Age", "32 (14 Mar 1994)"],
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
      identity: { ...IDENTITY, phone: null },
      facts: {
        heightCm: null,
        activityLevel: null,
        primaryGoal: null,
        dietaryRestrictions: "Vegetarian, Lactose",
        clientNotes: null,
      },
      startingWeightKg: null,
      currentWeightKg: null,
    };

    // act
    render(<ClientProfileBlock profile={sparse} />);

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
    ["female", "Female", "Her profile fills in once she sends her onboarding."],
    ["male", "Male", "His profile fills in once he sends his onboarding."],
    [
      "prefer_not_to_say",
      "Prefer not to say",
      "Their profile fills in once they send their onboarding.",
    ],
  ] as const)(
    "reads a %s client's identity, dashes the rest and says when her profile fills in before she sends her onboarding",
    (gender, genderLabel, pendingLine) => {
      // arrange
      const awaiting: ClientProfileView = {
        ...AWAITING_ONBOARDING,
        identity: { ...IDENTITY, gender },
      };

      // act
      render(<ClientProfileBlock profile={awaiting} />);

      // assert
      const profile = screen.getByRole("region", { name: "Profile" });
      expect(within(profile).getByText(pendingLine)).toBeInTheDocument();
      expect(readings(profile)).toEqual([
        ["Age", "32 (14 Mar 1994)"],
        ["Gender", genderLabel],
        ["Country", "Romania"],
        ["Phone", "+40712345678"],
        ...ONBOARDING_LABELS.map((label) => [label, "—"]),
      ]);
    },
  );

  it("dashes her weights until she sends her onboarding, whatever measurements exist", () => {
    // arrange
    const measuredEarly: ClientProfileView = {
      ...AWAITING_ONBOARDING,
      startingWeightKg: 64.5,
      currentWeightKg: 63.8,
    };

    // act
    render(<ClientProfileBlock profile={measuredEarly} />);

    // assert
    const profile = screen.getByRole("region", { name: "Profile" });
    expect(readings(profile).slice(5, 7)).toEqual([
      ["Starting weight", "—"],
      ["Current weight", "—"],
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
