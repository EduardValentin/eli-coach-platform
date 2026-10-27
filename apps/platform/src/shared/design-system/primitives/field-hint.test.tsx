// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { FieldHint } from "./field-hint";

afterEach(() => {
  cleanup();
});

describe("FieldHint", () => {
  it("describes the field that names it", () => {
    // arrange
    const hint = "Pick everything you have access to.";

    // act
    render(
      <>
        <input aria-describedby="equipment-hint" aria-label="Equipment" />
        <FieldHint id="equipment-hint">{hint}</FieldHint>
      </>,
    );

    // assert
    expect(
      screen.getByRole("textbox", { name: "Equipment" }),
    ).toHaveAccessibleDescription(hint);
    expect(screen.getByText(hint)).toHaveClass("text-sm", "text-text-muted");
  });
});
