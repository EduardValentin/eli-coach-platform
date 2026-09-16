// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Input } from "./input";

describe("Input", () => {
  it("uses the default field surface by default", () => {
    render(<Input aria-label="Name" />);

    expect(screen.getByLabelText("Name")).toHaveClass(
      "rounded-md",
      "border-border-subtle",
      "bg-surface-base",
      "shadow-soft",
    );
  });

  it("uses a blurred translucent surface for inverted inputs", () => {
    render(<Input aria-label="Email address" variant="inverted" />);

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
    expect(input).not.toHaveClass("rounded-md", "border-border-subtle", "bg-surface-base", "shadow-soft");
  });
});
