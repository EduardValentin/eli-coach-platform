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

  it("uses a blurred translucent surface for inverted inputs", () => {
    // arrange
    // act
    render(<Input aria-label="Email address" variant="inverted" />);

    // assert
    const input = screen.getByLabelText("Email address");
    expect(input).toHaveClass(
      "rounded-pill",
      "border-surface-base/30",
      "bg-surface-base/15",
      "backdrop-blur-xl",
      "backdrop-brightness-110",
      "backdrop-saturate-150",
      "placeholder:text-text-inverted/50",
      "focus-visible:ring-2",
      "focus-visible:ring-brand-primary/30",
      "shadow-none",
    );
    expect(input).not.toHaveClass("rounded-lg", "bg-surface-input");
  });
});
