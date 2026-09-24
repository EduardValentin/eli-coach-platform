// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";

import { WidgetLink } from "./widget-link";

afterEach(() => {
  cleanup();
});

describe("WidgetLink", () => {
  it("renders a link in the portal accent colour", () => {
    // arrange
    // act
    render(
      <MemoryRouter>
        <WidgetLink to="/coach/calls">View all calls</WidgetLink>
      </MemoryRouter>,
    );

    // assert
    const link = screen.getByRole("link", { name: "View all calls" });
    expect(link).toHaveAttribute("href", "/coach/calls");
    expect(link).toHaveClass(
      "inline-flex",
      "items-center",
      "gap-1.5",
      "text-sm",
      "font-medium",
      "text-portal-accent",
      "transition-colors",
      "hover:text-portal-accent-hover",
    );
    expect(link.querySelector("svg")).toBeNull();
  });

  it("trails an arrow glyph when asked", () => {
    // arrange
    // act
    render(
      <MemoryRouter>
        <WidgetLink arrow to="/coach/calls">
          View all calls
        </WidgetLink>
      </MemoryRouter>,
    );

    // assert
    const link = screen.getByRole("link", { name: "View all calls" });
    expect(link.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("takes extra classes from the caller", () => {
    // arrange
    // act
    render(
      <MemoryRouter>
        <WidgetLink className="mt-2" to="/coach/calls">
          View all calls
        </WidgetLink>
      </MemoryRouter>,
    );

    // assert
    expect(screen.getByRole("link", { name: "View all calls" })).toHaveClass(
      "mt-2",
      "text-portal-accent",
    );
  });
});
