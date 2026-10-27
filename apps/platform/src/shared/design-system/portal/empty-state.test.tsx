// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { CalendarSearch } from "lucide-react";
import { afterEach, describe, expect, it } from "vitest";

import { EmptyState } from "./empty-state";

afterEach(() => {
  cleanup();
});

describe("EmptyState", () => {
  it("reads the title and description with the icon hidden from readers", () => {
    // arrange
    // act
    const { container } = render(
      <EmptyState
        icon={CalendarSearch}
        title="No calls yet"
        description="Booked assessment calls appear here."
      />,
    );

    // assert
    expect(screen.getByText("No calls yet")).toHaveClass(
      "text-base",
      "font-semibold",
      "text-text-primary",
    );
    expect(
      screen.getByText("Booked assessment calls appear here."),
    ).toHaveClass("max-w-sm", "text-sm", "text-text-secondary");
    expect(container.querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("offers the action under the description when given", () => {
    // arrange
    // act
    render(
      <EmptyState
        icon={CalendarSearch}
        title="No calls found"
        description="Try a different search."
        action={<button type="button">Clear filters</button>}
      />,
    );

    // assert
    expect(
      screen.getByRole("button", { name: "Clear filters" }).parentElement,
    ).toHaveClass("mt-1");
  });
});
