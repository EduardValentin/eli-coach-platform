// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { afterEach, describe, expect, it } from "vitest";

import { MarketingCycleNutrition } from "./cycle-nutrition";

afterEach(() => {
  cleanup();
});

function renderCycleNutrition(options: {
  reducedMotion?: "always" | "never" | "user";
} = {}) {
  return render(
    <MotionConfig reducedMotion={options.reducedMotion ?? "never"}>
      <MarketingCycleNutrition />
    </MotionConfig>,
  );
}

describe("MarketingCycleNutrition", () => {
  it("renders the prototype narrative and initial wheel label", () => {
    // arrange
    // act
    renderCycleNutrition();

    // assert
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
        "Your menstrual cycle can influence your energy, appetite, training, and recovery. Your nutrition plan takes that into account, so you feel supported without having to overthink it.",
      ),
    ).toBeInTheDocument();
    expect(
      within(section).queryByText("Your plan handles this for you. You don’t have to remember any of it."),
    ).not.toBeInTheDocument();
    expect(within(section).getByText("DAY 25")).toBeInTheDocument();
    expect(within(section).getByText("Luteal")).toBeInTheDocument();
    expect(
      within(section).getByText("Complex carbs, protein-rich meals and root vegetables."),
    ).toBeInTheDocument();
  });

  it("renders exactly one section heading and no page-level heading", () => {
    // arrange
    // act
    renderCycleNutrition();

    // assert
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Your cycle is part of the plan.",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  });

  it("uses reduced-motion preference without removing the section content", () => {
    // arrange
    // act
    renderCycleNutrition({ reducedMotion: "always" });

    // assert
    const section = screen.getByRole("region", {
      name: "Your cycle is part of the plan.",
    });

    expect(within(section).getByText("DAY 25")).toBeInTheDocument();
    expect(within(section).getByText("Luteal")).toBeInTheDocument();
  });
});
