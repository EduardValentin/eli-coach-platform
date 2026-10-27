// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { Activity } from "lucide-react";
import { afterEach, describe, expect, it } from "vitest";

import { ItemIdentity } from "./item-identity";

afterEach(() => {
  cleanup();
});

describe("ItemIdentity", () => {
  it("names the item in bold primary ink", () => {
    // arrange
    render(<ItemIdentity icon={Activity} title="Back squat" />);

    // act
    const title = screen.getByText("Back squat");

    // assert
    expect(title).toHaveClass("text-sm", "font-semibold", "text-text-primary");
  });

  it("follows the name with its summary in small secondary ink", () => {
    // arrange
    render(
      <ItemIdentity
        icon={Activity}
        summary="Strength · Barbell"
        title="Back squat"
      />,
    );

    // act
    const summary = screen.getByText("Strength · Barbell");

    // assert
    expect(summary).toHaveClass("mt-0.5", "text-xs", "text-text-secondary");
  });

  it("shows no summary line when the item has none", () => {
    // arrange
    const { container } = render(
      <ItemIdentity icon={Activity} title="Back squat" />,
    );

    // act
    const lines = container.querySelectorAll("p");

    // assert
    expect(lines).toHaveLength(1);
  });

  it("leads with the item's glyph, hidden from assistive technology", () => {
    // arrange
    const { container } = render(
      <ItemIdentity icon={Activity} title="Back squat" />,
    );

    // act
    const glyph = container.querySelector("svg.lucide-activity")?.parentElement;

    // assert
    expect(glyph).toHaveAttribute("aria-hidden", "true");
  });

  it("carries the data attributes given for the whole, the glyph and the summary", () => {
    // arrange
    const { container } = render(
      <ItemIdentity
        data-row="squat"
        glyphAttributes={{ "data-parity": "exercise-glyph" }}
        icon={Activity}
        summary="Strength · Barbell"
        summaryAttributes={{ "data-parity": "exercise-summary" }}
        title="Back squat"
      />,
    );

    // act
    const glyph = container.querySelector('[data-parity="exercise-glyph"]');
    const summary = screen.getByText("Strength · Barbell");

    // assert
    expect(container.firstElementChild).toHaveAttribute("data-row", "squat");
    expect(glyph).toContainElement(container.querySelector("svg"));
    expect(summary).toHaveAttribute("data-parity", "exercise-summary");
  });
});
