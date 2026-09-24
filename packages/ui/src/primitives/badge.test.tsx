// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Badge } from "./badge";

afterEach(() => {
  cleanup();
});

describe("badge", () => {
  it("reads its label out as ordinary text", () => {
    // arrange, act
    render(<Badge>Today</Badge>);

    // assert
    expect(screen.getByText("Today")).toBeInTheDocument();
  });

  it("tints a brand-secondary badge with the secondary brand", () => {
    // arrange, act
    render(<Badge tone="brand-secondary">Today</Badge>);

    // assert
    expect(screen.getByText("Today")).toHaveClass(
      "bg-brand-secondary-surface",
      "text-brand-secondary",
    );
  });

  it("keeps a muted badge quiet against its surface", () => {
    // arrange, act
    render(<Badge tone="muted">Past</Badge>);

    // assert
    expect(screen.getByText("Past")).toHaveClass(
      "border-border-default",
      "text-text-muted",
    );
  });

  it("stays muted when no tone is named", () => {
    // arrange, act
    render(<Badge>Past</Badge>);

    // assert
    expect(screen.getByText("Past")).toHaveClass(
      "border-border-default",
      "text-text-muted",
    );
  });

  it("warms a pending badge with the pending status colour", () => {
    // arrange, act
    render(<Badge tone="pending">Pending</Badge>);

    // assert
    expect(screen.getByText("Pending")).toHaveClass(
      "bg-status-pending-soft",
      "text-status-pending",
    );
  });

  it("greens a success badge with the success feedback colour", () => {
    // arrange, act
    render(<Badge tone="success">Paid</Badge>);

    // assert
    expect(screen.getByText("Paid")).toHaveClass(
      "bg-feedback-success-soft",
      "text-feedback-success",
    );
  });

  it("draws a count as a small pill in the current ink", () => {
    // arrange, act
    render(<Badge tone="count">3</Badge>);

    // assert
    expect(screen.getByText("3")).toHaveClass(
      "rounded-full",
      "bg-current/12",
      "text-caption",
      "tabular-nums",
    );
  });

  it("names its slot so a container can restyle it", () => {
    // arrange, act
    render(<Badge tone="count">3</Badge>);

    // assert
    expect(screen.getByText("3")).toHaveAttribute("data-slot", "badge");
  });

  it("takes extra classes from the caller", () => {
    // arrange, act
    render(<Badge className="ml-2">Today</Badge>);

    // assert
    expect(screen.getByText("Today")).toHaveClass("ml-2");
  });
});
