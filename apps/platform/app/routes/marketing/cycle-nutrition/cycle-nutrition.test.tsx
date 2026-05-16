// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MarketingCycleNutrition } from "./cycle-nutrition";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubReducedMotionPreference(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      addEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      removeEventListener: vi.fn(),
    }),
  );
}

describe("MarketingCycleNutrition", () => {
  it("renders the prototype narrative and initial wheel label", () => {
    render(<MarketingCycleNutrition />);

    const section = screen.getByRole("region", {
      name: "Your cycle is part of the plan.",
    });

    expect(within(section).getByText("Nutrition that fits the picture")).toBeInTheDocument();
    expect(
      within(section).getByRole("heading", {
        level: 2,
        name: "Your cycle is part of the plan.",
      }),
    ).toBeInTheDocument();
    expect(
      within(section).getByText(
        "Your menstrual cycle changes how you feel, eat, and train through the month. Your plan takes that into account, so you don’t have to.",
      ),
    ).toBeInTheDocument();
    expect(
      within(section).getByText("Your plan handles this for you. You don’t have to remember any of it."),
    ).toBeInTheDocument();
    expect(within(section).getByText("DAY 25")).toBeInTheDocument();
    expect(within(section).getByText("Luteal")).toBeInTheDocument();
    expect(
      within(section).getByText("A few more complex carbs and root veggies to support the wind-down."),
    ).toBeInTheDocument();
  });

  it("renders exactly one section heading and no page-level heading", () => {
    render(<MarketingCycleNutrition />);

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Your cycle is part of the plan.",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  });

  it("uses reduced-motion preference without removing the section content", () => {
    stubReducedMotionPreference(true);

    render(<MarketingCycleNutrition />);

    const section = screen.getByRole("region", {
      name: "Your cycle is part of the plan.",
    });

    expect(within(section).getByText("DAY 25")).toBeInTheDocument();
    expect(within(section).getByText("Luteal")).toBeInTheDocument();
  });
});
