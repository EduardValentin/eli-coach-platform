// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ClientProfileView } from "~/bounded-contexts/clients/client-profile/public/client-profile";

import { ClientProfileBlock } from "./client-profile-block";

const NOW = new Date("2026-03-13T23:30:00.000Z");

const CLIENT_ID = "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11";

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
  preferences: { preferredCheckInWeekday: null, preferredChannel: null },
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
  it("reads her identity only: age on the coach's calendar with her date of birth, gender, country, phone and email", () => {
    // arrange, act
    renderBlock(PROFILE);

    // assert
    const profile = screen.getByRole("region", { name: "Profile" });
    expect(readings(profile)).toEqual([
      ["Age", "32 (14 Mar 1994)"],
      ["Gender", "Female"],
      ["Country", "Romania"],
      ["Phone", "+40712345678"],
      ["Email", "ana@example.com"],
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
    renderBlock(withoutPhone);

    // assert
    const profile = screen.getByRole("region", { name: "Profile" });
    expect(readings(profile)[3]).toEqual(["Phone", "—"]);
    expect(
      within(profile).queryByRole("link", { name: /^\+/ }),
    ).not.toBeInTheDocument();
  });

  it("links to her full profile page", () => {
    // arrange, act
    renderBlock(PROFILE);

    // assert
    const profile = screen.getByRole("region", { name: "Profile" });
    expect(
      within(profile).getByRole("link", { name: "View profile" }),
    ).toHaveAttribute("href", `/coach/clients/${CLIENT_ID}/profile`);
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
    renderBlock(profileOf);

    // assert
    const profile = screen.getByRole("region", { name: "Profile" });
    expect(readings(profile)[1]).toEqual(["Gender", genderLabel]);
  });
});

function renderBlock(profile: ClientProfileView) {
  render(
    <MemoryRouter>
      <ClientProfileBlock clientId={CLIENT_ID} profile={profile} />
    </MemoryRouter>,
  );
}

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
