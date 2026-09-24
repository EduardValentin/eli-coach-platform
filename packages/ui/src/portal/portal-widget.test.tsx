// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PortalWidget } from "./portal-widget";

afterEach(() => {
  cleanup();
});

describe("PortalWidget", () => {
  it("names its region after the heading", () => {
    // arrange
    // act
    render(
      <PortalWidget headingId="upcoming-calls-heading" title="Upcoming calls">
        Two calls
      </PortalWidget>,
    );

    // assert
    const region = screen.getByRole("region", { name: "Upcoming calls" });
    expect(region).toHaveAttribute("aria-labelledby", "upcoming-calls-heading");
    expect(
      screen.getByRole("heading", { level: 2, name: "Upcoming calls" }),
    ).toHaveAttribute("id", "upcoming-calls-heading");
    expect(region).toHaveTextContent("Two calls");
  });

  it("sets the hero in the large value rung with its unit beside it", () => {
    // arrange
    // act
    render(
      <PortalWidget
        headingId="weight-heading"
        title="Weight"
        hero="72.4"
        heroUnit="kg"
      />,
    );

    // assert
    expect(screen.getByText("72.4")).toHaveClass(
      "text-value-lg",
      "text-text-primary",
    );
    expect(screen.getByText("kg")).toHaveClass(
      "ml-1",
      "text-sm",
      "font-medium",
      "tracking-normal",
      "text-text-secondary",
    );
  });

  it("renders the footer only when given", () => {
    // arrange
    // act
    render(
      <PortalWidget
        headingId="calls-heading"
        title="Upcoming calls"
        footer={<a href="/coach/calls">View all calls</a>}
      />,
    );
    render(<PortalWidget headingId="quiet-heading" title="Quiet widget" />);

    // assert
    expect(
      screen.getByRole("link", { name: "View all calls" }).parentElement,
    ).toHaveClass("mt-auto", "pt-6");
    expect(
      screen
        .getByRole("region", { name: "Quiet widget" })
        .querySelector(".mt-auto"),
    ).toBeNull();
  });

  it("tightens the frame in the compact density", () => {
    // arrange
    // act
    render(
      <PortalWidget
        density="compact"
        headingId="steps-heading"
        title="Steps"
        hero="8,200"
        footer="Updated today"
      />,
    );

    // assert
    expect(screen.getByRole("region", { name: "Steps" })).toHaveClass(
      "rounded-card",
      "p-4",
    );
    expect(screen.getByRole("heading", { level: 2 })).toHaveClass(
      "text-sm",
      "font-semibold",
    );
    expect(screen.getByText("8,200")).toHaveClass("text-sm", "font-medium");
    expect(screen.getByText("Updated today")).toHaveClass("mt-auto", "pt-3");
  });

  it("frames the default density as a soft panel", () => {
    // arrange
    // act
    render(<PortalWidget headingId="panel-heading" title="Panel" />);

    // assert
    expect(screen.getByRole("region", { name: "Panel" })).toHaveClass(
      "flex",
      "flex-col",
      "rounded-panel",
      "border",
      "border-border-default/50",
      "bg-surface-base",
      "p-6",
      "shadow-soft",
    );
  });

  it("speaks the voice line in the heading face", () => {
    // arrange
    // act
    render(
      <PortalWidget
        headingId="voice-heading"
        title="Today"
        voice="Rest day. Walk if you like."
        context="Your coach set this."
      />,
    );

    // assert
    expect(screen.getByText("Rest day. Walk if you like.")).toHaveClass(
      "font-heading",
      "text-2xl",
      "tracking-tight",
      "text-text-primary",
    );
    expect(screen.getByText("Your coach set this.")).toHaveClass(
      "mt-1",
      "text-sm",
      "text-text-secondary",
    );
  });
});
