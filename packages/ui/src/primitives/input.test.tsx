// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Input } from "./input";

describe("Input", () => {
  it("uses the field surface by default", () => {
    // arrange
    // act
    render(<Input aria-label="Name" />);

    // assert
    expect(screen.getByLabelText("Name")).toHaveClass(
      "h-9",
      "rounded-lg",
      "border-transparent",
      "bg-surface-input",
      "focus-visible:border-border-focus",
      "aria-invalid:border-feedback-danger",
    );
  });
});
