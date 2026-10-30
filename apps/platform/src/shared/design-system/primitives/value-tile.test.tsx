// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ValueTile } from "./value-tile";

afterEach(() => {
  cleanup();
});

function renderTile(tone: Parameters<typeof ValueTile>[0]["tone"]) {
  render(
    <dl>
      <ValueTile label="P" tone={tone} value="42g" />
    </dl>,
  );

  return screen.getByText("P").parentElement as HTMLElement;
}

describe("ValueTile", () => {
  it("pairs the label with its value as a term and a definition", () => {
    // arrange, act
    const tile = renderTile("base");

    // assert
    expect(within(tile).getByText("P").tagName).toBe("DT");
    expect(within(tile).getByText("42g").tagName).toBe("DD");
  });

  it("is a parity root", () => {
    // arrange, act
    const tile = renderTile("base");

    // assert
    expect(tile).toHaveAttribute("data-parity-root", "ValueTile");
  });

  it("passes data attributes to its root", () => {
    // arrange, act
    render(
      <dl>
        <ValueTile data-testid="tile" label="C" tone="quiet" value="8g" />
      </dl>,
    );

    // assert
    expect(screen.getByTestId("tile")).toHaveTextContent("C8g");
  });

  it("centres its content on the compact corner", () => {
    // arrange, act
    const tile = renderTile("base");

    // assert
    expect(tile).toHaveClass(
      "rounded-compact",
      "px-1.5",
      "py-2",
      "text-center",
    );
  });

  it("sets the label in uppercase primary ink and the value in tabular figures", () => {
    // arrange, act
    const tile = renderTile("base");

    // assert
    expect(within(tile).getByText("P")).toHaveClass(
      "text-label",
      "uppercase",
      "text-text-primary",
    );
    expect(within(tile).getByText("42g")).toHaveClass(
      "text-sm",
      "font-medium",
      "text-text-primary",
      "tabular-nums",
      "leading-tight",
    );
  });

  it.each([
    ["base", "bg-surface-base"],
    ["quiet", "bg-surface-quiet"],
    ["tint-red", "bg-tint-red-soft"],
    ["tint-blue", "bg-tint-blue-soft"],
    ["tint-amber", "bg-tint-amber-soft"],
  ] as const)("fills a %s tile with %s", (tone, fill) => {
    // arrange, act
    const tile = renderTile(tone);

    // assert
    expect(tile).toHaveClass(fill);
  });
});
