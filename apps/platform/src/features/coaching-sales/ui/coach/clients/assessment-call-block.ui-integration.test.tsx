// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CoachClient } from "~/features/coaching-sales/contracts/coach-clients";

import { AssessmentCallBlock } from "./assessment-call-block";

const CLIENT: Pick<CoachClient, "assessmentCall"> = {
  assessmentCall: {
    startsAt: "2026-03-01T21:30:00.000Z",
    firstName: "Ana",
    lastName: "Popescu",
    email: "ana@example.com",
    dateOfBirth: "1994-03-14",
    gender: "female",
    country: "RO",
    phone: "+40712345678",
    primaryGoal: "build_strength",
    notes: "Knee surgery two years ago.",
  },
};

beforeEach(() => {
  coachIsIn("Pacific/Honolulu");
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("the client's assessment call block", () => {
  it("starts collapsed to its heading", () => {
    // arrange, act
    render(<AssessmentCallBlock client={CLIENT} />);

    // assert
    const call = screen.getByRole("region", { name: "Assessment call" });
    expect(
      within(call).getByRole("heading", { level: 2, name: "Assessment call" }),
    ).toBeInTheDocument();
    expect(
      within(call).getByRole("button", { name: "Assessment call" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(within(call).queryByRole("term")).toBeNull();
  });

  it("opens from the keyboard", async () => {
    // arrange
    const user = userEvent.setup();
    render(<AssessmentCallBlock client={CLIENT} />);
    await user.tab();

    // act
    await user.keyboard("{Enter}");

    // assert
    expect(
      screen.getByRole("button", { name: "Assessment call" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Ana Popescu")).toBeVisible();
  });

  it("reads the call on the coach's clock and everything she gave when booking it", async () => {
    // arrange
    const user = userEvent.setup();
    render(<AssessmentCallBlock client={CLIENT} />);

    // act
    await user.click(screen.getByRole("button", { name: "Assessment call" }));

    // assert
    const call = openedCallDetails();
    expect(readings(call)).toEqual([
      ["Call", "Sun, Mar 1 · 11:30 AM"],
      ["Name", "Ana Popescu"],
      ["Email", "ana@example.com"],
      ["Date of birth", "14 March 1994"],
      ["Gender", "Female"],
      ["Country", "Romania"],
      ["Phone", "+40712345678"],
      ["Primary goal", "Build strength"],
      ["Booking notes", "Knee surgery two years ago."],
    ]);
    expect(
      within(call).getByRole("link", { name: "+40712345678" }),
    ).toHaveAttribute("href", "tel:+40712345678");
  });

  it("shows a dash for a phone and notes she did not leave", async () => {
    // arrange
    const user = userEvent.setup();
    const sparse = {
      assessmentCall: { ...CLIENT.assessmentCall, phone: null, notes: null },
    };
    render(<AssessmentCallBlock client={sparse} />);

    // act
    await user.click(screen.getByRole("button", { name: "Assessment call" }));

    // assert
    const call = openedCallDetails();
    const shown = Object.fromEntries(readings(call));
    expect([shown.Phone, shown["Booking notes"]]).toEqual(["—", "—"]);
    expect(within(call).queryByRole("link")).toBeNull();
  });
});

function openedCallDetails(): HTMLElement {
  const [, details] = screen.getAllByRole("region", {
    name: "Assessment call",
  });

  return details as HTMLElement;
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
