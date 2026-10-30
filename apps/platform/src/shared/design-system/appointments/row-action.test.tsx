// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { Send, Video } from "lucide-react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";

import { RowActionButton, RowActionLink } from "./row-action";

afterEach(() => {
  cleanup();
});

describe("row action button", () => {
  it("renders a compact outline button by default", () => {
    // arrange
    // act
    render(<RowActionButton icon={Send}>Send payment link</RowActionButton>);

    // assert
    const button = screen.getByRole("button", { name: "Send payment link" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveClass(
      "h-(--size-control-xs)",
      "border",
      "bg-surface-base",
    );
    expect(button).toBeEnabled();
    expect(button).not.toHaveAttribute("aria-busy");
  });

  it("fills a primary row action with the portal interaction colour", () => {
    // arrange
    // act
    render(<RowActionButton tone="primary">Start</RowActionButton>);

    // assert
    expect(screen.getByRole("button", { name: "Start" })).toHaveClass(
      "bg-primary",
      "text-primary-foreground",
    );
  });

  it("outlines a destructive row action in the danger colour", () => {
    // arrange
    // act
    render(<RowActionButton tone="destructive">Remove</RowActionButton>);

    // assert
    expect(screen.getByRole("button", { name: "Remove" })).toHaveClass(
      "border-feedback-danger/30",
      "text-feedback-danger",
    );
  });

  it("holds the button busy and disabled while its action runs", () => {
    // arrange
    // act
    render(
      <RowActionButton busy icon={Send}>
        Send payment link
      </RowActionButton>,
    );

    // assert
    const button = screen.getByRole("button", { name: "Send payment link" });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toBeDisabled();
    expect(button.querySelector("svg")).toHaveClass("animate-spin");
  });
});

describe("row action link", () => {
  it("renders a compact outline link to its destination by default", () => {
    // arrange
    // act
    render(
      <MemoryRouter>
        <RowActionLink icon={Video} to="/book/call/join">
          Join call
        </RowActionLink>
      </MemoryRouter>,
    );

    // assert
    const link = screen.getByRole("link", { name: "Join call" });
    expect(link).toHaveAttribute("href", "/book/call/join");
    expect(link).toHaveClass(
      "h-(--size-control-xs)",
      "border",
      "bg-surface-base",
    );
  });

  it("fills a primary row link with the portal interaction colour", () => {
    // arrange
    // act
    render(
      <MemoryRouter>
        <RowActionLink to="/book/call/join" tone="primary">
          Join call
        </RowActionLink>
      </MemoryRouter>,
    );

    // assert
    expect(screen.getByRole("link", { name: "Join call" })).toHaveClass(
      "bg-primary",
      "text-primary-foreground",
    );
  });
});
