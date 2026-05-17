// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { afterEach, describe, expect, it } from "vitest";

import { MarketingMyMethod } from "./my-method";

afterEach(() => {
  cleanup();
});

function renderMyMethod(options: {
  reducedMotion?: "always" | "never" | "user";
} = {}) {
  return render(
    <MotionConfig reducedMotion={options.reducedMotion ?? "never"}>
      <MarketingMyMethod />
    </MotionConfig>,
  );
}

describe("MarketingMyMethod", () => {
  it("renders the prototype header and three pillars in order", () => {
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

    const pillars = within(section).getAllByRole("listitem");

    expect(pillars).toHaveLength(3);
    expect(pillars[0]).toHaveTextContent(
      "Eli teaches you how a woman’s body actually works — so your training makes sense, not just your schedule.",
    );
    expect(pillars[1]).toHaveTextContent(
      "No active cycle? Your plan still fits. Eli coaches you the same way.",
    );
    expect(pillars[2]).toHaveTextContent(
      "Eli reviews your workouts, listens to how you’re feeling, and adjusts the plan week by week.",
    );
  });

  it("renders visual numbering for the pillars", () => {
    renderMyMethod();

    const section = screen.getByRole("region", {
      name: "Why progress comes faster together.",
    });
    const pillars = within(section).getAllByRole("listitem");

    expect(pillars[0]).toHaveTextContent(/^1/);
    expect(pillars[1]).toHaveTextContent(/^2/);
    expect(pillars[2]).toHaveTextContent(/^3/);
  });

  it("exposes an accessible figure description while keeping graph SVG decorative", () => {
    renderMyMethod();

    const figure = screen.getByRole("figure");

    expect(within(figure).getByText("Progress, side by side")).toBeInTheDocument();
    expect(
      within(figure).getByRole("heading", {
        level: 3,
        name: "Faster results, fewer plateaus.",
      }),
    ).toBeInTheDocument();
    expect(
      within(figure).getByText(
        /The with-coach curve climbs faster and reaches higher than the on-your-own curve over six months./,
      ),
    ).toBeInTheDocument();
    expect(within(figure).getByText("With your coach")).toBeInTheDocument();
    expect(within(figure).getByText("On your own")).toBeInTheDocument();
    expect(within(figure).getByText("Month 1")).toBeInTheDocument();
    expect(within(figure).getByText("Month 6")).toBeInTheDocument();
    expect(figure.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("uses reduced-motion preference without removing the graph content", () => {
    renderMyMethod({ reducedMotion: "always" });

    const figure = screen.getByRole("figure");

    expect(within(figure).getByText("With your coach")).toBeInTheDocument();
    expect(within(figure).getByText("On your own")).toBeInTheDocument();
    expect(within(figure).getByText("Month 1")).toBeInTheDocument();
    expect(within(figure).getByText("Month 6")).toBeInTheDocument();
  });
});
