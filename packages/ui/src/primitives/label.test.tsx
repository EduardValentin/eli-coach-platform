// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { FieldCaption, Label, LabelSuffix, Legend } from "./label";

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
      <Label htmlFor="weight" invalid>
        Your weight
      </Label>,
    );

    // act
    const label = screen.getByText("Your weight");

    // assert
    expect(label).toHaveAttribute("data-error", "true");
    expect(label).toHaveClass("data-[error=true]:text-feedback-danger");
  });

  it("marks nothing about errors when its field does not report any", () => {
    // arrange
    render(<Label htmlFor="weight">Your weight</Label>);

    // act
    const label = screen.getByText("Your weight");

    // assert
    expect(label).not.toHaveAttribute("data-error");
  });
});

describe("Label layouts", () => {
  it("lets a long name and its qualifiers wrap on a shared baseline", () => {
    // arrange
    render(
      <Label htmlFor="weight" layout="wrap">
        Your weight
      </Label>,
    );

    // act
    const label = screen.getByText("Your weight");

    // assert
    expect(label).toHaveClass("flex-wrap", "items-baseline", "gap-1.5");
    expect(label).not.toHaveClass("items-center", "gap-2");
  });

  it("keeps a short name centred on one line by default", () => {
    // arrange
    render(<Label htmlFor="email">Email</Label>);

    // act
    const label = screen.getByText("Email");

    // assert
    expect(label).toHaveClass("flex", "items-center", "gap-2");
    expect(label).not.toHaveClass("flex-wrap");
  });
});

describe("FieldCaption", () => {
  it("titles a block of fields in the label ink without heading a fieldset", () => {
    // arrange
    render(<FieldCaption>Progress photos</FieldCaption>);

    // act
    const caption = screen.getByText("Progress photos");

    // assert
    expect(caption.tagName).toBe("P");
    expect(caption).toHaveClass("text-sm", "font-medium", "text-text-label");
    expect(caption).not.toHaveClass("mb-1");
  });
});

describe("Legend", () => {
  it("names the group of fields it heads, in the label ink", () => {
    // arrange
    render(
      <fieldset>
        <Legend>How do you measure?</Legend>
        <input aria-label="Metric" type="radio" />
      </fieldset>,
    );

    // act
    const group = screen.getByRole("group", { name: "How do you measure?" });

    // assert
    expect(group).toBeInTheDocument();
    expect(screen.getByText("How do you measure?")).toHaveClass(
      "text-sm",
      "font-medium",
      "text-text-label",
    );
  });
});

describe("LabelSuffix", () => {
  it("adds a quieter qualifier to the name of its field", () => {
    // arrange
    render(
      <>
        <Label htmlFor="waist">
          Waist <LabelSuffix>(cm)</LabelSuffix>
        </Label>
        <input id="waist" />
      </>,
    );

    // act
    const suffix = screen.getByText("(cm)");

    // assert
    expect(screen.getByLabelText(/Waist \(cm\)/)).toBeInTheDocument();
    expect(suffix).toHaveClass("font-normal", "text-text-secondary");
  });
});
