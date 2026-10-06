// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { InlineProblem } from "./inline-problem";

afterEach(() => {
  cleanup();
});

describe("InlineProblem", () => {
  it("states the problem in the danger tone beside an icon assistive technology skips", () => {
    // arrange
    const message = "Your payment details couldn't be opened just now.";

    // act
    render(<InlineProblem role="alert">{message}</InlineProblem>);

    // assert
    const problem = screen.getByRole("alert");
    expect(problem).toHaveTextContent(message);
    expect(problem).toHaveClass(
      "flex",
      "items-start",
      "gap-2",
      "text-sm",
      "leading-snug",
      "text-feedback-danger",
    );
    const icon = problem.querySelector("svg");
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(icon).toHaveAttribute("width", "16");
    expect(icon).toHaveClass("mt-0.5", "shrink-0");
  });

  it("describes the control that names it and takes the caller's spacing", () => {
    // arrange
    const message = "Choose when you'd like your program to start.";

    // act
    render(
      <>
        <button aria-describedby="start-problem" type="button">
          Continue
        </button>
        <InlineProblem className="mt-3" id="start-problem">
          {message}
        </InlineProblem>
      </>,
    );

    // assert
    expect(
      screen.getByRole("button", { name: "Continue" }),
    ).toHaveAccessibleDescription(message);
    expect(screen.getByText(message)).toHaveClass("mt-3");
  });
});
