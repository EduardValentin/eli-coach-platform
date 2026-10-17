// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { Soup } from "lucide-react";
import { afterEach, describe, expect, it } from "vitest";

import { ItemVisual } from "./item-visual";

afterEach(() => {
  cleanup();
});

describe("ItemVisual", () => {
  it("is an image named by the item it stands for", () => {
    // arrange, act
    render(<ItemVisual icon={Soup} name="Lentil soup" />);

    // assert
    expect(
      screen.getByRole("img", { name: "Lentil soup" }),
    ).toBeInTheDocument();
  });

  it("centres the icon on the quiet surface", () => {
    // arrange, act
    render(<ItemVisual icon={Soup} name="Lentil soup" />);

    // assert
    expect(screen.getByRole("img")).toHaveClass(
      "flex",
      "items-center",
      "justify-center",
      "bg-surface-quiet",
    );
  });

  it("draws the icon at 28px unless told otherwise, hidden from assistive technology", () => {
    // arrange, act
    const { container } = render(<ItemVisual icon={Soup} name="Lentil soup" />);

    // assert
    const icon = container.querySelector("svg");
    expect(icon).toHaveAttribute("width", "28");
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });

  it("draws the icon at the size it is given", () => {
    // arrange, act
    const { container } = render(
      <ItemVisual icon={Soup} iconSize={48} name="Lentil soup" />,
    );

    // assert
    expect(container.querySelector("svg")).toHaveAttribute("width", "48");
  });

  it("takes its dimensions from the caller", () => {
    // arrange, act
    render(
      <ItemVisual className="h-32 w-full" icon={Soup} name="Lentil soup" />,
    );

    // assert
    expect(screen.getByRole("img")).toHaveClass("h-32", "w-full");
  });

  it("passes data attributes to its root", () => {
    // arrange, act
    render(
      <ItemVisual data-parity="recipe-visual" icon={Soup} name="Lentil soup" />,
    );

    // assert
    expect(screen.getByRole("img")).toHaveAttribute(
      "data-parity",
      "recipe-visual",
    );
  });
});
