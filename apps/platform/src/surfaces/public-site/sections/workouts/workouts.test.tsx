// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MarketingWorkouts } from "./workouts";

afterEach(() => {
  cleanup();
});

function renderWorkouts() {
  return render(<MarketingWorkouts />);
}

const expectedSchedule = [
  ["Mon", "Strength"],
  ["Tue", "Rest"],
  ["Wed", "Recovery"],
  ["Thu", "Strength"],
  ["Fri", "Rest"],
  ["Sat", "Hypertrophy"],
  ["Sun", "Recovery"],
] as const;

describe("MarketingWorkouts", () => {
  it("renders the prototype header and seven-day schedule", () => {
    // arrange
    // act
    renderWorkouts();

    // assert
    const section = screen.getByRole("region", {
      name: "Workouts that support your body",
    });

    expect(within(section).getByText("A week of training")).toBeInTheDocument();
    expect(
      within(section).getByRole("heading", {
        level: 2,
        name: "Workouts that support your body",
      }),
    ).toBeInTheDocument();
    expect(
      within(section).getByText("A balanced week built around how you feel — not a fixed template."),
    ).toBeInTheDocument();

    const schedule = within(section).getByRole("list", {
      name: "Weekly workout schedule",
    });
    const cards = within(schedule).getAllByRole("listitem");

    expect(cards).toHaveLength(expectedSchedule.length);

    expectedSchedule.forEach(([dayName, dayType], index) => {
      expect(within(cards[index] as HTMLElement).getByText(dayName)).toBeInTheDocument();
      expect(within(cards[index] as HTMLElement).getByText(dayType)).toBeInTheDocument();
    });
  });

  it("keeps the schedule cards static instead of interactive", () => {
    // arrange
    // act
    renderWorkouts();

    // assert
    const section = screen.getByRole("region", {
      name: "Workouts that support your body",
    });

    expect(within(section).queryAllByRole("button")).toHaveLength(0);
    expect(within(section).queryAllByRole("link")).toHaveLength(0);
    expect(within(section).queryAllByRole("tab")).toHaveLength(0);
  });
});
