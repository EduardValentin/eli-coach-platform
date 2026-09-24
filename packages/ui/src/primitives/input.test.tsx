// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Input } from "./input";

afterEach(() => {
  cleanup();
});

describe("Input", () => {
  it("uses the field surface by default", () => {
    // arrange
    // act
    render(<Input aria-label="Name" />);

    // assert
    expect(screen.getByLabelText("Name")).toHaveClass(
      "h-12",
      "rounded-field",
      "border-control-border-soft",
      "bg-surface-base",
      "focus-visible:border-border-focus",
      "aria-invalid:border-feedback-danger",
    );
    expect(screen.getByLabelText("Name")).toHaveAttribute("data-size", "md");
  });

  it("shrinks to the small control height when asked", () => {
    // arrange
    // act
    render(<Input aria-label="Search" size="sm" />);

    // assert
    expect(screen.getByLabelText("Search")).toHaveClass(
      "h-(--size-control-sm)",
    );
    expect(screen.getByLabelText("Search")).toHaveAttribute("data-size", "sm");
  });
});
