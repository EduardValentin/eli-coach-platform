// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { BrandMark } from "./brand-mark";

afterEach(() => {
  cleanup();
});

function markOf(container: HTMLElement): HTMLElement {
  return container.querySelector('[data-parity="brand-mark"]') as HTMLElement;
}

describe("brand mark", () => {
  it("is decorative, hidden from assistive technology", () => {
    // arrange, act
    const { container } = render(<BrandMark />);

    // assert
    expect(markOf(container)).toHaveAttribute("aria-hidden", "true");
  });

  it("draws the outline and core in the brand colour by default", () => {
    // arrange, act
    const { container } = render(<BrandMark />);

    // assert
    expect(markOf(container)).toHaveClass("border-brand-primary");
    expect(markOf(container).firstElementChild).toHaveClass("bg-brand-primary");
  });

  it("takes the surrounding ink when transparent", () => {
    // arrange, act
    const { container } = render(<BrandMark appearance="transparent" />);

    // assert
    expect(markOf(container)).toHaveClass("border-current");
    expect(markOf(container).firstElementChild).toHaveClass("bg-current");
  });
});
