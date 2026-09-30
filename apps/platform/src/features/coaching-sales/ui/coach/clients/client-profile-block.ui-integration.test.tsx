// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CoachClient } from "~/features/coaching-sales/contracts/coach-clients";

import { ClientProfileBlock } from "./client-profile-block";

const NOW = new Date("2026-03-13T23:30:00.000Z");

const CLIENT: Pick<CoachClient, "profile"> = {
  profile: {
    country: "RO",
    dateOfBirth: "1994-03-14",
    gender: "female",
    phone: "+40712345678",
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
  it("reads her age on the coach's calendar, her gender, country and phone", () => {
    // arrange, act
    render(<ClientProfileBlock client={CLIENT} />);

    // assert
    const profile = screen.getByRole("region", { name: "Profile" });
    expect(readings(profile)).toEqual([
      ["Age", "32"],
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
    const withoutPhone = { profile: { ...CLIENT.profile, phone: null } };

    // act
    render(<ClientProfileBlock client={withoutPhone} />);

    // assert
    const profile = screen.getByRole("region", { name: "Profile" });
    expect(Object.fromEntries(readings(profile)).Phone).toBe("—");
    expect(within(profile).queryByRole("link")).toBeNull();
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
