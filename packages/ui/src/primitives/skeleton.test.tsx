// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Skeleton } from "./skeleton";

afterEach(() => {
  cleanup();
});

describe("Skeleton", () => {
  it("renders a muted rounded placeholder block that may sit inside a button", () => {
    // arrange
    // act
    const { container } = render(<Skeleton aria-hidden="true" />);

    // assert
    const placeholder = container.firstElementChild;
    expect(placeholder?.tagName).toBe("SPAN");
    expect(placeholder).toHaveAttribute("data-slot", "skeleton");
    expect(placeholder).toHaveClass(
      "block",
      "animate-pulse",
      "rounded-field",
      "bg-surface-muted",
    );
  });

  it("takes its size and attributes from the caller", () => {
    // arrange
    // act
    const { container } = render(
      <Skeleton className="h-3 w-12" data-parity="hour-clashes-loading" />,
    );

    // assert
    const placeholder = container.firstElementChild;
    expect(placeholder).toHaveClass("h-3", "w-12", "bg-surface-muted");
    expect(placeholder).toHaveAttribute("data-parity", "hour-clashes-loading");
  });
});
