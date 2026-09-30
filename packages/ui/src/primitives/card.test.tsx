// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Card } from "./card";

afterEach(() => {
  cleanup();
});

describe("Card", () => {
  it("sets an inset block on a tint of the quiet surface inside a larger frame", () => {
    // arrange
    const content = "Progress photos";

    // act
    render(<Card variant="inset">{content}</Card>);

    // assert
    expect(screen.getByText(content)).toHaveClass(
      "rounded-card",
      "border",
      "border-border-subtle",
      "bg-surface-quiet/60",
      "p-4",
    );
  });
});
