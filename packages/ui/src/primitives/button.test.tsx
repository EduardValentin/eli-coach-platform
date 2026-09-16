// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Button } from "./button";
import { IconButton } from "./icon-button";

afterEach(() => {
  cleanup();
});

describe("button focus affordances", () => {
  it("sets an explicit focus-visible outline style on text buttons", () => {
    render(<Button>Save</Button>);

    expect(screen.getByRole("button", { name: "Save" })).toHaveClass(
      "focus-visible:outline-solid",
    );
  });

  it("sets an explicit focus-visible outline style on icon buttons", () => {
    render(<IconButton aria-label="Save" />);

    expect(screen.getByRole("button", { name: "Save" })).toHaveClass(
      "focus-visible:outline-solid",
    );
  });
});
