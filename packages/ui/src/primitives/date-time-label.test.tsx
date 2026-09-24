// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { DateTimeLabel } from "./date-time-label";

afterEach(() => {
  cleanup();
});

const when = { date: "Thu, Mar 12", time: "3:30 PM" };

describe("DateTimeLabel", () => {
  it("reads the date and the time as two pieces of text", () => {
    // arrange
    // act
    render(<DateTimeLabel when={when} />);

    // assert
    expect(screen.getByText("Thu, Mar 12")).toBeInTheDocument();
    expect(screen.getByText("· 3:30 PM")).toHaveClass(
      "text-sm",
      "text-text-secondary",
    );
  });

  it("sets the date in the field text size by default", () => {
    // arrange
    // act
    render(<DateTimeLabel when={when} />);

    // assert
    expect(screen.getByText("Thu, Mar 12")).toHaveClass(
      "text-base",
      "font-medium",
    );
  });

  it("shrinks the date to the small text size when asked", () => {
    // arrange
    // act
    render(<DateTimeLabel size="sm" when={when} />);

    // assert
    expect(screen.getByText("Thu, Mar 12")).toHaveClass(
      "text-sm",
      "font-medium",
      "text-text-primary",
    );
  });

  it("takes extra classes on its wrapper from the caller", () => {
    // arrange
    // act
    render(<DateTimeLabel className="mt-0.5" when={when} />);

    // assert
    expect(screen.getByText("Thu, Mar 12").parentElement).toHaveClass(
      "inline-flex",
      "flex-wrap",
      "items-baseline",
      "gap-x-1.5",
      "mt-0.5",
    );
  });
});
