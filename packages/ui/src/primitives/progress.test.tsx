// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Progress } from "./progress";

afterEach(() => {
  cleanup();
});

function indicatorOf(bar: HTMLElement): HTMLElement {
  const indicator = bar.firstElementChild;
  if (!(indicator instanceof HTMLElement)) {
    throw new Error("The progress bar has no indicator.");
  }

  return indicator;
}

describe("Progress", () => {
  it("reports how far it has got and slides its indicator that far along", () => {
    // arrange
    // act
    render(<Progress aria-label="Upload progress" value={40} />);

    // assert
    const bar = screen.getByRole("progressbar", { name: "Upload progress" });
    expect(bar).toHaveAttribute("aria-valuenow", "40");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
    expect(bar).toHaveClass(
      "relative",
      "h-2",
      "w-full",
      "overflow-hidden",
      "rounded-full",
      "bg-primary/20",
    );
    expect(indicatorOf(bar)).toHaveClass(
      "h-full",
      "w-full",
      "flex-1",
      "bg-primary",
      "transition-all",
    );
    expect(indicatorOf(bar).style.transform).toBe("translateX(-60%)");
  });

  it("moves a one-third segment back and forth when it cannot tell how far it has got", () => {
    // arrange
    // act
    render(<Progress aria-label="Preparing pages" />);

    // assert
    const bar = screen.getByRole("progressbar", { name: "Preparing pages" });
    expect(bar).not.toHaveAttribute("aria-valuenow");
    expect(bar).toHaveAttribute("data-state", "indeterminate");
    expect(indicatorOf(bar)).toHaveClass(
      "h-full",
      "w-1/3",
      "bg-primary",
      "animate-progress-indeterminate",
    );
    expect(indicatorOf(bar).style.transform).toBe("");
  });

  it("holds a still, full-width, half-faded bar instead of moving when motion is reduced", () => {
    // arrange
    // act
    render(<Progress aria-label="Preparing pages" />);

    // assert
    expect(
      indicatorOf(screen.getByRole("progressbar", { name: "Preparing pages" })),
    ).toHaveClass(
      "motion-reduce:w-full",
      "motion-reduce:animate-none",
      "motion-reduce:opacity-50",
    );
  });

  it("takes a thinner bar from its caller", () => {
    // arrange
    // act
    render(
      <Progress aria-label="Upload progress" className="h-1.5" value={0} />,
    );

    // assert
    const bar = screen.getByRole("progressbar", { name: "Upload progress" });
    expect(bar).toHaveClass("h-1.5");
    expect(bar).not.toHaveClass("h-2");
    expect(indicatorOf(bar).style.transform).toBe("translateX(-100%)");
  });
});
