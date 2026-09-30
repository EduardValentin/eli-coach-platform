// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Reading } from "./reading";

afterEach(() => {
  cleanup();
});

describe("Reading", () => {
  it("reads as a term and its definition inside a description list", () => {
    // arrange
    // act
    render(
      <dl>
        <Reading
          as="dl-item"
          label="Bundle"
          value="3 months"
          valueParity="subscription-bundle"
        />
      </dl>,
    );

    // assert
    const term = screen.getByRole("term");
    const definition = screen.getByRole("definition");
    expect(term).toHaveTextContent("Bundle");
    expect(term).toHaveClass("text-label", "uppercase", "text-text-secondary");
    expect(definition).toHaveTextContent("3 months");
    expect(definition).toHaveClass(
      "mt-1",
      "text-sm",
      "font-medium",
      "text-text-primary",
    );
    expect(definition).toHaveAttribute("data-parity", "subscription-bundle");
  });

  it("reads as a label paragraph above a value paragraph by default", () => {
    // arrange
    // act
    const { container } = render(
      <Reading label="Check-in day" value="Monday" />,
    );

    // assert
    expect(screen.queryByRole("term")).not.toBeInTheDocument();
    expect(
      Array.from(container.querySelectorAll("p"), (line) => line.textContent),
    ).toEqual(["Check-in day", "Monday"]);
  });

  it("sets a large value in the large rung with its unit beside it", () => {
    // arrange
    // act
    render(<Reading label="Weight" size="lg" unit="kg" value="72.4" />);

    // assert
    expect(screen.getByText("72.4")).toHaveClass(
      "text-value-lg",
      "tabular-nums",
    );
    expect(screen.getByText("kg")).toHaveClass(
      "ml-1",
      "text-sm",
      "font-medium",
      "text-text-secondary",
      "tracking-normal",
    );
  });

  it("sets an adornment after the label, centred on its line", () => {
    // arrange
    // act
    render(
      <dl>
        <Reading
          as="dl-item"
          label="Cycle mode"
          labelAdornment={<button type="button">What cycle mode means</button>}
          value="Phase-based"
        />
      </dl>,
    );

    // assert
    const term = screen.getByRole("term");
    expect(term).toHaveClass("flex", "items-center", "gap-1");
    expect(term.lastElementChild).toBe(
      screen.getByRole("button", { name: "What cycle mode means" }),
    );
  });

  it("keeps a plain label outside a flex row", () => {
    // arrange
    // act
    render(
      <dl>
        <Reading as="dl-item" label="Channel" value="Email" />
      </dl>,
    );

    // assert
    expect(screen.getByRole("term")).not.toHaveClass("flex");
  });

  it("lays itself out with the class it is given", () => {
    // arrange
    // act
    const { container } = render(
      <Reading className="col-span-full" label="Booking notes" value="—" />,
    );

    // assert
    expect(container.firstElementChild).toHaveClass("col-span-full");
  });
});
