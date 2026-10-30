// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AttentionDot } from "./attention-dot";

afterEach(() => {
  cleanup();
});

describe("attention dot", () => {
  it("draws an 8px status-pending circle that assistive technology skips", () => {
    // arrange, act
    const { container } = render(<AttentionDot />);

    // assert
    const dot = container.querySelector('[data-parity="attention-dot"]');
    expect(dot).toHaveAttribute("aria-hidden", "true");
    expect(dot).toHaveClass("size-2", "rounded-full", "bg-status-pending");
  });

  it("takes the placement its caller gives it", () => {
    // arrange, act
    const { container } = render(
      <AttentionDot className="absolute top-2 right-2" />,
    );

    // assert
    expect(
      container.querySelector('[data-parity="attention-dot"]'),
    ).toHaveClass("absolute", "top-2", "right-2");
  });
});
