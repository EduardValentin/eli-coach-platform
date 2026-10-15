// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WidgetAction, WidgetLink } from "./widget-link";

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
        <WidgetLink to="/coach/calls" trailing="arrow">
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

describe("WidgetAction", () => {
  it("renders a button with the widget link look", () => {
    // arrange
    // act
    render(<WidgetAction>Set up a weekly check-in</WidgetAction>);

    // assert
    const action = screen.getByRole("button", {
      name: "Set up a weekly check-in",
    });
    expect(action).toHaveAttribute("type", "button");
    expect(action).toHaveClass(
      "inline-flex",
      "items-center",
      "gap-1.5",
      "text-sm",
      "font-medium",
      "text-portal-accent",
      "transition-colors",
      "hover:text-portal-accent-hover",
    );
    expect(action.querySelector("svg")).toBeNull();
  });

  it("trails an arrow glyph when asked", () => {
    // arrange
    // act
    render(
      <WidgetAction trailing="arrow">Set up a weekly check-in</WidgetAction>,
    );

    // assert
    const action = screen.getByRole("button", {
      name: "Set up a weekly check-in",
    });
    expect(action.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("runs its handler when pressed", async () => {
    // arrange
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <WidgetAction onClick={onClick}>Set up a weekly check-in</WidgetAction>,
    );

    // act
    await user.click(
      screen.getByRole("button", { name: "Set up a weekly check-in" }),
    );

    // assert
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("looks unavailable while it is held back", () => {
    // arrange
    // act
    render(
      <WidgetAction aria-disabled="true">
        Set up a weekly check-in
      </WidgetAction>,
    );

    // assert
    expect(
      screen.getByRole("button", { name: "Set up a weekly check-in" }),
    ).toHaveClass(
      "aria-disabled:cursor-not-allowed",
      "aria-disabled:opacity-50",
      "aria-disabled:hover:text-portal-accent",
    );
  });

  it("hands its button to the caller's ref", () => {
    // arrange
    const ref = createRef<HTMLButtonElement>();

    // act
    render(<WidgetAction ref={ref}>Set up a weekly check-in</WidgetAction>);

    // assert
    expect(ref.current).toBe(
      screen.getByRole("button", { name: "Set up a weekly check-in" }),
    );
  });
});
