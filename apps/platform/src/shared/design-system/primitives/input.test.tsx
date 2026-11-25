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
      "h-(--size-control-md)",
      "rounded-field",
      "border-control-border-soft",
      "bg-surface-base",
      "focus-visible:border-focus-ring",
      "aria-invalid:border-feedback-danger",
    );
  });

  it("shows its placeholder in the soft placeholder colour", () => {
    // arrange
    // act
    render(<Input aria-label="Name" placeholder="e.g. Back squat" />);

    // assert
    expect(screen.getByLabelText("Name")).toHaveClass(
      "placeholder:text-placeholder-soft",
    );
  });
});
