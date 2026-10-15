// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  FieldCaption,
  Label,
  LabelSuffix,
  Legend,
  RequiredMark,
} from "./label";

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

  it("stars a required field, hides the star, and names the field as required", () => {
    // arrange
    render(
      <>
        <Label htmlFor="weight" required>
          Your weight
        </Label>
        <input id="weight" />
      </>,
    );

    // act
    const field = screen.getByRole("textbox");

    // assert
    expect(screen.getByText("*")).toHaveAttribute("aria-hidden", "true");
    expect(field).toHaveAccessibleName("Your weight (required)");
  });

  it("shows no star when the field is optional", () => {
    // arrange
    render(<Label htmlFor="weight">Your weight</Label>);

    // act
    const star = screen.queryByText("*");

    // assert
    expect(star).not.toBeInTheDocument();
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

describe("FieldCaption", () => {
  it("titles a block of fields in the label ink without heading a fieldset", () => {
    // arrange
    render(<FieldCaption>Progress photos</FieldCaption>);

    // act
    const caption = screen.getByText("Progress photos");

    // assert
    expect(caption.tagName).toBe("P");
    expect(caption).toHaveClass("text-sm", "font-medium", "text-text-label");
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

describe("required Legend", () => {
  it("stars a required group and names it as required", () => {
    // arrange
    render(
      <fieldset>
        <Legend required>Where do you train?</Legend>
        <input aria-label="Gym" type="radio" />
      </fieldset>,
    );

    // act
    const group = screen.getByRole("group", {
      name: "Where do you train? (required)",
    });

    // assert
    expect(group).toBeInTheDocument();
    expect(screen.getByText("*")).toHaveAttribute("aria-hidden", "true");
  });

  it("shows no star when the group is optional", () => {
    // arrange
    render(
      <fieldset>
        <Legend>Where do you train?</Legend>
      </fieldset>,
    );

    // act
    const star = screen.queryByText("*");

    // assert
    expect(star).not.toBeInTheDocument();
  });
});

describe("RequiredMark", () => {
  it("stars running text with a hidden star and a spoken (required)", () => {
    // arrange
    render(
      <label>
        <input type="checkbox" />
        I agree to the terms.
        <RequiredMark />
      </label>,
    );

    // act
    const agreement = screen.getByRole("checkbox", {
      name: "I agree to the terms. (required)",
    });

    // assert
    expect(agreement).toBeInTheDocument();
    expect(screen.getByText("*")).toHaveAttribute("aria-hidden", "true");
  });
});

describe("Label with qualifiers", () => {
  it("sets the star after the name and before its qualifiers", () => {
    // arrange
    render(
      <Label
        htmlFor="waist"
        layout="wrap"
        required
        trailing={<LabelSuffix>(cm)</LabelSuffix>}
      >
        Waist
      </Label>,
    );

    // act
    const label = screen.getByText("Waist");

    // assert
    expect(label).toHaveTextContent(/^Waist\* \(required\)\(cm\)$/);
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
