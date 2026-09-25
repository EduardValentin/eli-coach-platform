// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { Avatar } from "./avatar";

afterEach(() => {
  cleanup();
});

function renderAvatar(avatar: ReactElement) {
  const { container } = render(avatar);
  const root = container.firstElementChild;

  return { fallback: root?.firstElementChild, root };
}

describe("avatar", () => {
  it("stands in for a missing picture with the initials of the first two names", () => {
    // arrange, act
    const { root } = renderAvatar(<Avatar name="ana maria Popescu" />);

    // assert
    expect(root?.textContent).toBe("AM");
  });

  it("stands in with one initial for a single name", () => {
    // arrange, act
    const { root } = renderAvatar(<Avatar name="Ana" />);

    // assert
    expect(root?.textContent).toBe("A");
  });

  it("hides the stand-in from assistive technology, since the name is beside it", () => {
    // arrange, act
    const { fallback } = renderAvatar(<Avatar name="Ana Popescu" />);

    // assert
    expect(fallback).toHaveAttribute("aria-hidden", "true");
  });

  it("sits at the medium size with the initials on the neutral surface by default", () => {
    // arrange, act
    const { fallback, root } = renderAvatar(<Avatar name="Ana Popescu" />);

    // assert
    expect(root).toHaveClass(
      "size-10",
      "[&_[data-slot=avatar-fallback]]:text-sm",
      "rounded-full",
      "overflow-hidden",
    );
    expect(fallback).toHaveClass(
      "font-medium",
      "bg-surface-neutral",
      "text-text-primary",
      "rounded-full",
    );
  });

  it("grows to the large size with larger initials", () => {
    // arrange, act
    const { root } = renderAvatar(<Avatar name="Ana Popescu" size="lg" />);

    // assert
    expect(root).toHaveClass(
      "size-16",
      "[&_[data-slot=avatar-fallback]]:text-xl",
    );
  });

  it("mutes the whole avatar when the moment it belongs to has passed, keeping the primary ink", () => {
    // arrange, act
    const { fallback, root } = renderAvatar(<Avatar name="Ana" tone="muted" />);

    // assert
    expect(root).toHaveClass("opacity-70");
    expect(fallback).toHaveClass("text-text-primary");
  });
});
