// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Label } from "./label";

afterEach(() => {
  cleanup();
});

describe("Label", () => {
  it("names the field it is bound to", () => {
    // arrange
    render(
      <>
        <Label htmlFor="weight">Your weight</Label>
        <input id="weight" />
      </>,
    );

    // act
    const field = screen.getByLabelText("Your weight");

    // assert
    expect(field).toHaveAttribute("id", "weight");
  });

  it("turns to the danger colour while its field is in error", () => {
    // arrange
    render(
      <Label data-error htmlFor="weight">
        Your weight
      </Label>,
    );

    // act
    const label = screen.getByText("Your weight");

    // assert
    expect(label).toHaveAttribute("data-error", "true");
    expect(label).toHaveClass("data-[error=true]:text-feedback-danger");
  });
});
