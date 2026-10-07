// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { FieldLayout } from "./field-layout";

const HINT = "First thing in the morning, before eating.";

const PROBLEM = "Enter a weight.";

afterEach(() => {
  cleanup();
});

describe("FieldLayout", () => {
  it("names its control with the label and its suffixes", () => {
    // arrange
    const suffixes = [{ text: "(kg)" }, { text: "(optional)" }];

    // act
    render(
      <FieldLayout label={<span>Weight</span>} suffixes={suffixes}>
        {(control) => <input {...control} />}
      </FieldLayout>,
    );

    // assert
    expect(screen.getByRole("textbox")).toHaveAccessibleName(
      "Weight(kg)(optional)",
    );
  });

  it("describes its control with the hint", () => {
    // arrange
    const hint = HINT;

    // act
    render(
      <FieldLayout hint={hint} label="Weight">
        {(control) => <input {...control} />}
      </FieldLayout>,
    );

    // assert
    const control = screen.getByRole("textbox", { name: "Weight" });
    expect(control).toHaveAccessibleDescription(HINT);
    expect(control).toHaveAttribute("aria-invalid", "false");
  });

  it("describes its control with the hint and the problem and marks it invalid", () => {
    // arrange
    const error = PROBLEM;

    // act
    render(
      <FieldLayout error={error} hint={HINT} label="Weight">
        {(control) => <input {...control} />}
      </FieldLayout>,
    );

    // assert
    const control = screen.getByRole("textbox", { name: "Weight" });
    expect(control).toHaveAccessibleDescription(`${HINT} ${PROBLEM}`);
    expect(control).toBeInvalid();
  });

  it.each([
    { hintPlacement: "before-control", order: ["LABEL", "P", "INPUT"] },
    { hintPlacement: "after-control", order: ["LABEL", "INPUT", "P"] },
  ] as const)("sets the hint $hintPlacement", ({ hintPlacement, order }) => {
    // arrange
    const label = "Height";

    // act
    const { container } = render(
      <FieldLayout hint={HINT} hintPlacement={hintPlacement} label={label}>
        {(control) => <input {...control} />}
      </FieldLayout>,
    );

    // assert
    const lines = [...(container.firstElementChild?.children ?? [])];
    expect(lines.map((line) => line.tagName)).toEqual(order);
  });

  it("wraps the label with its suffixes on the text baseline by default", () => {
    // arrange
    // act
    render(
      <FieldLayout label="Description" suffixes={[{ text: "(optional)" }]}>
        {(control) => <textarea {...control} />}
      </FieldLayout>,
    );

    // assert
    const label = screen.getByText("Description");
    expect(label).toHaveClass("flex-wrap", "items-baseline", "gap-1.5");
  });

  it("sets a plain label inline when asked", () => {
    // arrange
    // act
    render(
      <FieldLayout label="Title" labelLayout="inline">
        {(control) => <input {...control} />}
      </FieldLayout>,
    );

    // assert
    const label = screen.getByText("Title");
    expect(label).toHaveClass("flex", "items-center", "gap-2");
    expect(label).not.toHaveClass("flex-wrap", "items-baseline");
  });
});
