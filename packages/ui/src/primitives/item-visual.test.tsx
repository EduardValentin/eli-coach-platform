// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

  it("shows the photo it is given, cover-fitted and named by its alt text, loading lazily", () => {
    // arrange, act
    render(
      <ItemVisual
        className="h-32 w-full"
        icon={Soup}
        name="Lentil soup"
        photo={{ alt: "Lentil soup", src: "/media/lentil-soup.webp" }}
      />,
    );

    // assert
    const photo = screen.getByRole("img", { name: "Lentil soup" });
    expect(photo.tagName).toBe("IMG");
    expect(photo).toHaveAttribute("src", "/media/lentil-soup.webp");
    expect(photo).toHaveAttribute("loading", "lazy");
    expect(photo).toHaveClass("object-cover", "h-32", "w-full");
  });

  it("falls back to the icon when the photo does not load", () => {
    // arrange
    const { container } = render(
      <ItemVisual
        icon={Soup}
        name="Lentil soup"
        photo={{ alt: "Lentil soup", src: "/media/missing.webp" }}
      />,
    );

    // act
    fireEvent.error(screen.getByRole("img", { name: "Lentil soup" }));

    // assert
    expect(container.querySelector("img")).toBeNull();
    const visual = screen.getByRole("img", { name: "Lentil soup" });
    expect(visual).toHaveClass("bg-surface-quiet");
    expect(visual.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("shows a new photo again after an earlier one failed to load", () => {
    // arrange
    const { container, rerender } = render(
      <ItemVisual
        icon={Soup}
        name="Lentil soup"
        photo={{ alt: "Lentil soup", src: "/media/missing.webp" }}
      />,
    );
    fireEvent.error(screen.getByRole("img", { name: "Lentil soup" }));

    // act
    rerender(
      <ItemVisual
        icon={Soup}
        name="Lentil soup"
        photo={{ alt: "Lentil soup", src: "/media/lentil-soup.webp" }}
      />,
    );

    // assert
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "/media/lentil-soup.webp",
    );
  });

  it("passes data attributes to the photo", () => {
    // arrange, act
    render(
      <ItemVisual
        data-parity="recipe-visual"
        icon={Soup}
        name="Lentil soup"
        photo={{ alt: "Lentil soup", src: "/media/lentil-soup.webp" }}
      />,
    );

    // assert
    expect(screen.getByRole("img", { name: "Lentil soup" })).toHaveAttribute(
      "data-parity",
      "recipe-visual",
    );
  });

  it("passes data attributes to the icon that stands in for a photo that failed", () => {
    // arrange
    render(
      <ItemVisual
        data-parity="recipe-visual"
        icon={Soup}
        name="Lentil soup"
        photo={{ alt: "Lentil soup", src: "/media/missing.webp" }}
      />,
    );

    // act
    fireEvent.error(screen.getByRole("img", { name: "Lentil soup" }));

    // assert
    const visual = screen.getByRole("img", { name: "Lentil soup" });
    expect(visual.tagName).toBe("DIV");
    expect(visual).toHaveAttribute("data-parity", "recipe-visual");
  });
});
