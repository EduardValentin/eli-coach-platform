// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
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

  it("shows the picture when there is one, with no duplicate of the name", () => {
    // arrange, act
    render(<Avatar imageUrl="https://example.test/ana.png" name="Ana" />);

    // assert
    const picture = screen.getByRole("presentation");

    expect(picture).toHaveAttribute("src", "https://example.test/ana.png");
    expect(picture).toHaveAttribute("alt", "");
  });

  it("mutes the stand-in when the moment it belongs to has passed", () => {
    // arrange, act
    const { container } = render(<Avatar name="Ana" tone="muted" />);

    // assert
    expect(container.firstElementChild).toHaveClass(
      "bg-surface-neutral",
      "text-text-muted",
    );
  });
});
