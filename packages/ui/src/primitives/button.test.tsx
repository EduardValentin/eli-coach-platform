// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Button, buttonVariants } from "./button";

afterEach(() => {
  cleanup();
});

describe("button corner", () => {
  it("rounds every text button to the button corner", () => {
    // arrange
    // act
    render(<Button>Save</Button>);

    // assert
    expect(screen.getByRole("button", { name: "Save" })).toHaveClass(
      "rounded-field",
    );
  });

  it("gives a button-styled link the same corner", () => {
    // arrange
    // act
    const classes = buttonVariants({ variant: "outline" }).split(" ");

    // assert
    expect(classes).toContain("rounded-field");
    expect(classes).not.toContain("rounded-full");
  });

  it("rounds an icon button fully", () => {
    // arrange
    // act
    render(
      <Button aria-label="Sort ascending" size="icon-sm">
        <svg aria-hidden="true" />
      </Button>,
    );

    // assert
    expect(screen.getByRole("button", { name: "Sort ascending" })).toHaveClass(
      "rounded-full",
      "size-(--size-control-sm)",
    );
  });
});

describe("button ladder", () => {
  it("fills a primary button with the portal interaction colour", () => {
    // arrange
    // act
    render(<Button variant="primary">Save</Button>);

    // assert
    expect(screen.getByRole("button", { name: "Save" })).toHaveClass(
      "bg-primary",
      "text-primary-foreground",
      "hover:bg-primary-hover",
    );
  });

  it("leaves a ghost button unfilled until it is hovered", () => {
    // arrange
    // act
    render(<Button variant="ghost">Clear</Button>);

    // assert
    expect(screen.getByRole("button", { name: "Clear" })).toHaveClass(
      "text-text-label",
      "hover:bg-surface-quiet",
      "hover:text-text-primary",
    );
  });

  it("gives the small size its height and its own text size", () => {
    // arrange
    // act
    render(<Button size="sm">Clear filters</Button>);

    // assert
    expect(screen.getByRole("button", { name: "Clear filters" })).toHaveClass(
      "h-(--size-control-sm)",
      "text-sm",
    );
  });

  it("keeps the public site's default size and text", () => {
    // arrange
    // act
    render(<Button>Book a call</Button>);

    // assert
    expect(screen.getByRole("button", { name: "Book a call" })).toHaveClass(
      "h-(--size-control-md)",
      "text-base",
    );
  });

  it("lets an explicit text size override the size's own", () => {
    // arrange
    // act
    const classes = buttonVariants({ size: "xs", textSize: "base" }).split(" ");

    // assert
    expect(classes).toContain("text-base");
    expect(classes).not.toContain("text-sm");
  });

  it("merges a caller's classes into a button-styled link", () => {
    // arrange
    // act
    const classes = buttonVariants({
      className: "px-2.5 gap-1",
      size: "xs",
    }).split(" ");

    // assert
    expect(classes).toContain("px-2.5");
    expect(classes).toContain("gap-1");
    expect(classes).not.toContain("px-3");
    expect(classes).not.toContain("gap-2");
  });
});
