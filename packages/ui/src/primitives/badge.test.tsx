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

  it("tints an accent badge with the secondary brand", () => {
    // arrange, act
    render(<Badge tone="accent">Today</Badge>);

    // assert
    expect(screen.getByText("Today")).toHaveClass(
      "bg-brand-secondary-surface",
      "text-brand-secondary",
    );
  });

  it("keeps a neutral badge quiet against its surface", () => {
    // arrange, act
    render(<Badge tone="neutral">Past</Badge>);

    // assert
    expect(screen.getByText("Past")).toHaveClass(
      "border-border-default",
      "text-text-muted",
    );
  });

  it("takes extra classes from the caller", () => {
    // arrange, act
    render(<Badge className="ml-2">Today</Badge>);

    // assert
    expect(screen.getByText("Today")).toHaveClass("ml-2");
  });
});
