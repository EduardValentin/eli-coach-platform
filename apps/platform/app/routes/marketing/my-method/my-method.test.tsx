// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MarketingMyMethod } from "./my-method";

afterEach(() => {
  cleanup();
});

const expectedPillars = [
  "Eli teaches you how a woman’s body actually works — so your training makes sense, not just your schedule.",
  "No active cycle? Your plan still fits. Eli coaches you the same way.",
  "Eli reviews your workouts, listens to how you’re feeling, and adjusts the plan week by week.",
] as const;

function renderMyMethod() {
  return render(<MarketingMyMethod />);
}

describe("MarketingMyMethod", () => {
  it("renders the prototype header and ordered pillars", () => {
    renderMyMethod();

    const section = screen.getByRole("region", {
      name: "Why progress comes faster together.",
    });

    expect(within(section).getByText("My method")).toBeInTheDocument();
    expect(
      within(section).getByRole("heading", {
        level: 2,
        name: "Why progress comes faster together.",
      }),
    ).toBeInTheDocument();

    const pillarList = within(section).getByRole("list", {
      name: "Coaching method pillars",
    });
    const pillars = within(pillarList).getAllByRole("listitem");

    expect(pillars).toHaveLength(expectedPillars.length);

    expectedPillars.forEach((pillar, index) => {
      const pillarItem = pillars[index] as HTMLElement;

      expect(within(pillarItem).getByText(String(index + 1))).toBeInTheDocument();
      expect(within(pillarItem).getByText(pillar)).toBeInTheDocument();
    });
  });

  it("renders an accessible decorative progress visual", () => {
    renderMyMethod();

    const section = screen.getByRole("region", {
      name: "Why progress comes faster together.",
    });
    const figure = within(section).getByRole("figure", {
      name: "Faster results, fewer plateaus.",
    });

    expect(within(figure).getByText("Progress, side by side")).toBeInTheDocument();
    expect(
      within(figure).getByRole("heading", {
        level: 3,
        name: "Faster results, fewer plateaus.",
      }),
    ).toBeInTheDocument();
    expect(
      within(figure).getByText(
        'A line graph comparing two progress curves over six months. The solid brand-colored curve labeled "With your coach" climbs steeper and reaches a higher point than the dashed gray curve labeled "On your own".',
      ),
    ).toBeInTheDocument();
    expect(within(figure).getByText("With your coach")).toBeInTheDocument();
    expect(within(figure).getByText("On your own")).toBeInTheDocument();
    expect(within(figure).getByText("Month 1")).toBeInTheDocument();
    expect(within(figure).getByText("Month 6")).toBeInTheDocument();
    expect(figure.querySelector("svg[aria-hidden='true']")).toBeInTheDocument();
    expect(figure.querySelectorAll("path")).toHaveLength(2);
  });
});
