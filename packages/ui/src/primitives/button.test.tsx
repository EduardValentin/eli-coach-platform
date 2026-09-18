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
      "rounded-xl",
    );
  });

  it("gives a button-styled link the same corner", () => {
    // arrange
    // act
    const classes = buttonVariants({ variant: "outline" }).split(" ");

    // assert
    expect(classes).toContain("rounded-xl");
    expect(classes).not.toContain("rounded-pill");
  });
});
