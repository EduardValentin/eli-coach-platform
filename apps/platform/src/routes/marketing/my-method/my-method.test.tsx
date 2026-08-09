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
    // arrange
    // act
    renderMyMethod();

    // assert
    const section = screen.getByRole("region", {
      name: "Why progress is easier with support.",
    });

    expect(within(section).getByText("My method")).toBeInTheDocument();
    expect(
      within(section).getByRole("heading", {
        level: 2,
        name: "Why progress is easier with support.",
      }),
    ).toBeInTheDocument();

    const pillars = within(section).getAllByRole("listitem");

    expect(pillars).toHaveLength(3);
    expect(pillars[0]).toHaveTextContent(
      "You’ll learn how your body works, so your training makes sense.",
    );
    expect(pillars[1]).toHaveTextContent(
      "Whether you have an active menstrual cycle or not, your plan is still personalized around your body, energy, lifestyle, and goals.",
    );
    expect(pillars[2]).toHaveTextContent(
      "You’ll get weekly support, workout reviews, and plan adjustments based on your progress, energy, and schedule.",
    );
  });

  it("renders visual numbering for the pillars", () => {
    // arrange
    // act
    renderMyMethod();

    // assert
    const section = screen.getByRole("region", {
      name: "Why progress is easier with support.",
    });
    const pillars = within(section).getAllByRole("listitem");

    expect(pillars[0]).toHaveTextContent(/^1/);
    expect(pillars[1]).toHaveTextContent(/^2/);
    expect(pillars[2]).toHaveTextContent(/^3/);
  });

  it("exposes an accessible figure description while keeping graph SVG decorative", () => {
    // arrange
    // act
    renderMyMethod();

    // assert
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
    // arrange
    // act
    renderMyMethod({ reducedMotion: "always" });

    // assert
    const figure = screen.getByRole("figure");

    expect(within(figure).getByText("With your coach")).toBeInTheDocument();
    expect(within(figure).getByText("On your own")).toBeInTheDocument();
    expect(within(figure).getByText("Month 1")).toBeInTheDocument();
    expect(within(figure).getByText("Month 6")).toBeInTheDocument();
  });
});
