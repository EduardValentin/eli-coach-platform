// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Input } from "./input";

describe("Input", () => {
  it("uses a blurred translucent surface for inverted inputs", () => {
    render(<Input aria-label="Email address" variant="inverted" />);

    expect(screen.getByLabelText("Email address")).toHaveClass("backdrop-blur-md");
  });
});
