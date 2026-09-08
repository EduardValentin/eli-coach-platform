// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Skeleton } from "./skeleton";

afterEach(() => {
  cleanup();
});

describe("skeleton placeholder", () => {
  it("hides the placeholder from assistive technology", () => {
    // arrange
    const { container } = render(<Skeleton />);

    // act
    const placeholder = container.querySelector("[data-skeleton]");

    // assert
    expect(placeholder).toHaveAttribute("aria-hidden", "true");
  });

  it("paints the placeholder surface and pulses only when motion is welcome", () => {
    // arrange
    const { container } = render(<Skeleton />);

    // act
    const placeholder = container.querySelector("[data-skeleton]");

    // assert
    expect(placeholder).toHaveClass(
      "bg-surface-placeholder",
      "motion-safe:animate-pulse",
      "rounded-placeholder",
    );
  });

  it("lets a caller size and reshape one placeholder without losing the contract", () => {
    // arrange
    const { container } = render(<Skeleton className="size-16 rounded-thumbnail" />);

    // act
    const placeholder = container.querySelector("[data-skeleton]");

    // assert
    expect(placeholder).toHaveClass(
      "bg-surface-placeholder",
      "rounded-thumbnail",
      "size-16",
    );
    expect(placeholder).not.toHaveClass("rounded-placeholder");
  });
});
