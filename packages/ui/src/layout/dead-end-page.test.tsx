// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { DeadEndPage, DeadEndPanel } from "./dead-end-page";

afterEach(() => {
  cleanup();
});

describe("DeadEndPage", () => {
  it("fills the page with a labelled main landmark holding the eyebrow, heading, description and its one way out", () => {
    // arrange
    // act
    render(
      <DeadEndPage
        description="This page doesn't exist."
        eyebrow="Error 404"
        icon={<svg aria-hidden="true" />}
        landmarkLabel="Error"
        title="Page not found"
      >
        <a href="/">Back to home</a>
      </DeadEndPage>,
    );

    // assert
    const main = screen.getByRole("main", { name: "Error" });
    expect(main).toHaveClass("min-h-screen", "bg-surface-page");
    expect(main).toHaveTextContent("Error 404");
    expect(
      screen.getByRole("heading", { level: 1, name: "Page not found" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to home" })).toBeVisible();
  });

  it("reads as two sentences with no eyebrow and no action when it offers no way out", () => {
    // arrange
    // act
    render(
      <DeadEndPage
        data-parity-root="PortalEnded"
        description="It was good to train together."
        icon={<svg aria-hidden="true" />}
        landmarkLabel="Your coaching has ended"
        title="Your coaching has ended"
      />,
    );

    // assert
    const main = screen.getByRole("main", { name: "Your coaching has ended" });
    expect(main).toHaveAttribute("data-parity-root", "PortalEnded");
    expect(main.querySelectorAll("p")).toHaveLength(1);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("adds a quieter detail line under the description", () => {
    // arrange
    const detail =
      "Eli will refund you in the next few days; it reaches your card within 5–10 business days.";

    // act
    render(
      <DeadEndPage
        description="It was good to train together."
        detail={detail}
        icon={<svg aria-hidden="true" />}
        landmarkLabel="Your coaching has ended"
        title="Your coaching has ended"
      />,
    );

    // assert
    const line = screen.getByText(detail);
    expect(line).toHaveAttribute("data-parity", "dead-end-detail");
    expect(line).toHaveClass(
      "mt-3",
      "max-w-md",
      "text-base",
      "leading-relaxed",
      "text-text-secondary",
    );
    expect(line.previousElementSibling).toHaveTextContent(
      "It was good to train together.",
    );
  });
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
});
