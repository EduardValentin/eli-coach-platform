// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Textarea } from "./textarea";

afterEach(() => {
  cleanup();
});

describe("Textarea", () => {
  it("renders a multiline field on the same surface as the inputs", () => {
    // arrange
    // act
    render(<Textarea aria-label="Notes" />);

    // assert
    const field = screen.getByRole("textbox", { name: "Notes" });
    expect(field.tagName).toBe("TEXTAREA");
    expect(field).toHaveClass(
      "rounded-field",
      "border-control-border-soft",
      "bg-surface-base",
      "focus-visible:border-border-focus",
      "aria-invalid:border-feedback-danger",
      "resize-none",
    );
  });
});
