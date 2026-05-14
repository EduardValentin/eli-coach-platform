// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { MarketingPlatform } from "./platform";

afterEach(() => {
  cleanup();
});

function renderPlatform() {
  return render(<MarketingPlatform />);
}

function getCloudButtons(name: string) {
  return screen.getAllByRole("button", { name });
}

function expectCloudPressed(name: string, expectedPressed: boolean) {
  expect(
    getCloudButtons(name).every(
      (button) => button.getAttribute("aria-pressed") === String(expectedPressed),
    ),
  ).toBe(true);
}

describe("MarketingPlatform", () => {
  it("renders the platform section header, cloud controls, and default workout phone view", () => {
    renderPlatform();

    expect(screen.getByText("Your fitness, in one app")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Open your phone, see your plan.",
      }),
    ).toBeInTheDocument();

    expectCloudPressed("Personalized workouts", true);
    expectCloudPressed("Nutrition planner", false);
    expectCloudPressed("Chat with your coach", false);
    expectCloudPressed("Cycle tracking", false);
    expect(screen.getAllByRole("group", { name: "App capabilities" })).toHaveLength(2);
    expect(screen.getByText("Week 3 · Day 2")).toBeInTheDocument();
    expect(screen.getByText("Lower Strength")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 3, name: "Lower Strength" })).not.toBeInTheDocument();
  });

  it("swaps the active phone view when a cloud is selected", async () => {
    const user = userEvent.setup();

    renderPlatform();

    await user.click(getCloudButtons("Nutrition planner")[0]);

    expectCloudPressed("Nutrition planner", true);
    expect(screen.getByText("Today · April 17")).toBeInTheDocument();
    expect(screen.getByText("Your nutrition")).toBeInTheDocument();
    expect(screen.queryByText("Lower Strength")).not.toBeInTheDocument();

    await user.click(getCloudButtons("Chat with your coach")[0]);

    expectCloudPressed("Chat with your coach", true);
    expect(screen.getByText("Eli Fitness")).toBeInTheDocument();
    expect(screen.getByText("How did Tuesday's session feel?")).toBeInTheDocument();
    expect(screen.getByText("Check-in proposed")).toBeInTheDocument();

    await user.click(getCloudButtons("Cycle tracking")[0]);

    expectCloudPressed("Cycle tracking", true);
    expect(screen.getByText("Day 14 · Cycle")).toBeInTheDocument();
    expect(screen.getByText("Ovulatory phase")).toBeInTheDocument();
    expect(screen.getByText("Day 1–5")).toBeInTheDocument();
    expect(screen.getByText("Day 6–13")).toBeInTheDocument();
    expect(screen.getByText("Day 14–16")).toBeInTheDocument();
    expect(screen.getByText("Day 17–28")).toBeInTheDocument();
  });

  it("keeps phone proposal actions visual instead of interactive", async () => {
    const user = userEvent.setup();

    renderPlatform();

    await user.click(getCloudButtons("Chat with your coach")[0]);

    const proposal = screen.getByText("Fri 9:00 AM · 20 min").closest("section");

    expect(proposal).not.toBeNull();
    expect(within(proposal as HTMLElement).queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    expect(within(proposal as HTMLElement).getByText("Approve")).toBeInTheDocument();
    expect(within(proposal as HTMLElement).getByText("Reschedule")).toBeInTheDocument();
  });
});
