// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { CardBrandMark } from "./card-brand-mark";

afterEach(() => {
  cleanup();
});

function renderedTile(brand: string) {
  const { container } = render(<CardBrandMark brand={brand} />);
  const tile = container.firstElementChild;
  const mark = container.querySelector("svg");

  if (!tile || !mark) {
    throw new Error("No mark rendered");
  }

  return { tile, mark };
}

describe("CardBrandMark", () => {
  it.each([
    ["visa", "visa"],
    ["mastercard", "mastercard"],
    ["amex", "card"],
    ["unknown", "card"],
  ])("draws the %s card with the %s mark", (brand, drawn) => {
    // arrange, act
    const { mark } = renderedTile(brand);

    // assert
    expect(mark).toHaveAttribute("data-mark", drawn);
  });

  it("frames the mark in a 48 by 32 tile that assistive technology skips", () => {
    // arrange, act
    const { tile, mark } = renderedTile("visa");

    // assert
    expect(tile).toHaveAttribute("aria-hidden", "true");
    expect(tile).toHaveClass(
      "flex",
      "h-8",
      "w-12",
      "shrink-0",
      "overflow-hidden",
      "rounded-tile",
      "border",
      "border-border-subtle",
      "bg-surface-base",
      "text-text-secondary",
    );
    expect(mark).toHaveAttribute("aria-hidden", "true");
    expect(mark).toHaveAttribute("viewBox", "0 0 46 30");
    expect(mark).toHaveClass("size-full");
  });

  it("takes the caller's data attributes on the tile", () => {
    // arrange, act
    const { container } = render(
      <CardBrandMark brand="visa" data-parity="payment-card-mark" />,
    );

    // assert
    expect(container.firstElementChild).toHaveAttribute(
      "data-parity",
      "payment-card-mark",
    );
  });
});
