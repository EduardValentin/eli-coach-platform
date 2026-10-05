// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { DeadEndPanel } from "./dead-end-page";

afterEach(() => {
  cleanup();
});

describe("DeadEndPanel", () => {
  it("announces the dead end with its heading, description and icon inside a portal panel", () => {
    // arrange
    // act
    render(
      <DeadEndPanel
        description="Your clients could not be loaded. Try again in a moment."
        icon={<svg aria-hidden="true" data-testid="icon" />}
        title="Clients unavailable"
      />,
    );

    // assert
    const panel = screen.getByRole("alert");
    expect(panel).toHaveClass(
      "rounded-panel",
      "border-border-default/50",
      "bg-surface-base",
      "shadow-soft",
      "flex",
      "flex-col",
      "items-center",
      "px-6",
      "py-16",
      "text-center",
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Clients unavailable" }),
    ).toBeInTheDocument();
    expect(panel).toHaveTextContent(
      "Your clients could not be loaded. Try again in a moment.",
    );
    expect(panel).toContainElement(screen.getByTestId("icon"));
  });

  it("carries a data attribute such as a parity hook on the panel", () => {
    // arrange
    // act
    render(
      <DeadEndPanel
        data-parity="unavailable-panel"
        description="Try again in a moment."
        icon={<svg aria-hidden="true" />}
        title="Unavailable"
      />,
    );

    // assert
    expect(screen.getByRole("alert")).toHaveAttribute(
      "data-parity",
      "unavailable-panel",
    );
  });

  it("offers its one way on, such as a retry, centred below the description", () => {
    // arrange
    // act
    render(
      <DeadEndPanel
        action={<button type="button">Try again</button>}
        description="Something went wrong on our side."
        icon={<svg aria-hidden="true" />}
        title="Resources didn’t load"
      />,
    );

    // assert
    const action = screen.getByRole("button", { name: "Try again" });
    expect(screen.getByRole("alert")).toContainElement(action);
    expect(action.parentElement).toHaveClass("mt-8", "flex", "justify-center");
    expect(
      screen.getByText("Something went wrong on our side."),
    ).not.toContainElement(action);
  });

  it("renders no action row when it has no action", () => {
    // arrange
    // act
    render(
      <DeadEndPanel
        description="Try again in a moment."
        icon={<svg aria-hidden="true" />}
        title="Unavailable"
      />,
    );

    // assert
    expect(screen.getByRole("alert").lastElementChild?.tagName).toBe("P");
  });
});
