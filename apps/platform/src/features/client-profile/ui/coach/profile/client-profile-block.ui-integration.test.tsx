// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ClientProfileView } from "~/features/client-profile/public/client-profile";

import { ClientProfileBlock } from "./client-profile-block";

const NOW = new Date("2026-03-13T23:30:00.000Z");

const IDENTITY: ClientProfileView["identity"] = {
  firstName: "Ana",
  lastName: "Popescu",
  email: "ana@example.com",
  dateOfBirth: "1994-03-14",
  gender: "female",
  country: "RO",
  phone: "+40712345678",
};

const PROFILE: ClientProfileView = {
  identity: IDENTITY,
  coaching: null,
  coachNotes: null,
  settings: { preferredCheckInWeekday: null, preferredChannel: null },
  avatarUrl: null,
  startingWeightKg: 64.5,
  currentWeightKg: 63.8,
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
  it("reads her identity only: age on the coach's calendar with her date of birth, gender, country and phone", () => {
    // arrange, act
    render(<ClientProfileBlock profile={PROFILE} />);

    // assert
    const profile = screen.getByRole("region", { name: "Profile" });
    expect(readings(profile)).toEqual([
      ["Age", "32 (14 Mar 1994)"],
      ["Gender", "Female"],
      ["Country", "Romania"],
      ["Phone", "+40712345678"],
    ]);
    expect(
      within(profile).getByRole("link", { name: "+40712345678" }),
    ).toHaveAttribute("href", "tel:+40712345678");
  });

  it("shows a dash for a phone she has not given", () => {
    // arrange
    const withoutPhone: ClientProfileView = {
      ...PROFILE,
      identity: { ...IDENTITY, phone: null },
    };

    // act
    render(<ClientProfileBlock profile={withoutPhone} />);

    // assert
    const profile = screen.getByRole("region", { name: "Profile" });
    expect(readings(profile).at(-1)).toEqual(["Phone", "—"]);
    expect(within(profile).queryByRole("link")).toBeNull();
  });

  it.each([
    ["male", "Male"],
    ["prefer_not_to_say", "Prefer not to say"],
  ] as const)("reads a %s client's gender", (gender, genderLabel) => {
    // arrange
    const profileOf: ClientProfileView = {
      ...PROFILE,
      identity: { ...IDENTITY, gender },
    };

    // act
    render(<ClientProfileBlock profile={profileOf} />);

    // assert
    const profile = screen.getByRole("region", { name: "Profile" });
    expect(readings(profile)[1]).toEqual(["Gender", genderLabel]);
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
