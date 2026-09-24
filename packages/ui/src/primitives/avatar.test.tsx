// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Avatar } from "./avatar";

afterEach(() => {
  cleanup();
});

describe("avatar", () => {
  it("stands in for a missing picture with the first letter of the name", () => {
    // arrange, act
    const { container } = render(<Avatar name="Ana Popescu" />);

    // assert
    expect(container.textContent).toBe("A");
  });

  it("hides the stand-in from assistive technology, since the name is beside it", () => {
    // arrange, act
    const { container } = render(<Avatar name="Ana Popescu" />);

    // assert
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("sits at the medium size on the neutral surface by default", () => {
    // arrange, act
    const { container } = render(<Avatar name="Ana Popescu" />);

    // assert
    expect(container.firstElementChild).toHaveClass(
      "size-10",
      "text-sm",
      "font-medium",
      "bg-surface-neutral",
      "text-text-primary",
    );
  });

  it("grows to the large size with larger initials", () => {
    // arrange, act
    const { container } = render(<Avatar name="Ana Popescu" size="lg" />);

    // assert
    expect(container.firstElementChild).toHaveClass("size-16", "text-xl");
  });

  it("mutes the stand-in when the moment it belongs to has passed", () => {
    // arrange, act
    const { container } = render(<Avatar name="Ana" tone="muted" />);

    // assert
    expect(container.firstElementChild).toHaveClass(
      "bg-surface-neutral",
      "text-text-primary",
      "opacity-70",
    );
  });
});
