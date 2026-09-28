// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Stepper } from "./stepper";

afterEach(() => {
  cleanup();
});

function stepBarsOf(container: HTMLElement) {
  return Array.from(
    container.querySelector('[aria-hidden="true"]')?.children ?? [],
  );
}

describe("Stepper", () => {
  it("names the current step and the length of the run", () => {
    // arrange
    const props = { current: 2, total: 5 };

    // act
    render(<Stepper {...props} />);

    // assert
    expect(screen.getByText("Step 2 of 5")).toBeInTheDocument();
  });

  it("draws one bar per step, hidden from assistive technology", () => {
    // arrange
    const props = { current: 2, total: 5 };

    // act
    const { container } = render(<Stepper {...props} />);

    // assert
    expect(stepBarsOf(container)).toHaveLength(5);
    expect(screen.getByText("Step 2 of 5")).not.toHaveAttribute("aria-hidden");
  });

  it("fills the bars behind the current step, marks the current one and leaves the rest muted", () => {
    // arrange
    const props = { current: 2, total: 3 };

    // act
    const { container } = render(<Stepper {...props} />);

    // assert
    const [done, current, upcoming] = stepBarsOf(container);
    expect(done).toHaveClass("bg-primary/40");
    expect(current).toHaveClass("bg-primary");
    expect(upcoming).toHaveClass("bg-surface-muted");
  });

  it("shows the status it is given beside the step count", () => {
    // arrange
    const status = <p role="status">Saved</p>;

    // act
    render(<Stepper current={1} status={status} total={4} />);

    // assert
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
  });

  it("keeps the step count from shrinking and gives the status its own truncating column", () => {
    // arrange
    const status = <p role="status">Saved</p>;

    // act
    render(<Stepper current={1} status={status} total={4} />);

    // assert
    expect(screen.getByText("Step 1 of 4")).toHaveClass("shrink-0");
    expect(screen.getByRole("status").parentElement).toHaveClass(
      "min-w-0",
      "text-right",
    );
  });

  it("renders the status column even without a status", () => {
    // arrange
    const props = { current: 1, total: 4 };

    // act
    render(<Stepper {...props} />);

    // assert
    expect(
      screen.getByText("Step 1 of 4").parentElement?.lastElementChild,
    ).toHaveClass("min-w-0", "text-right");
  });

  it("passes its remaining attributes to its outer element", () => {
    // arrange
    const props = { current: 1, total: 4, title: "Onboarding progress" };

    // act
    render(<Stepper {...props} />);

    // assert
    expect(screen.getByTitle("Onboarding progress")).toHaveTextContent(
      "Step 1 of 4",
    );
  });
});
