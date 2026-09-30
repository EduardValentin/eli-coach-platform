// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { ChoiceGroup, ChoiceOption } from "./choice-group";

afterEach(() => {
  cleanup();
});

function renderUnits(onValueChange: (value: string) => void) {
  return render(
    <>
      <p id="units-legend">How do you measure?</p>
      <ChoiceGroup
        aria-labelledby="units-legend"
        defaultValue="metric"
        onValueChange={onValueChange}
      >
        <ChoiceOption value="metric">kg · cm</ChoiceOption>
        <ChoiceOption value="imperial">lb · in</ChoiceOption>
      </ChoiceGroup>
    </>,
  );
}

describe("ChoiceGroup", () => {
  it("is one radio group named by its legend, with each option named by its text", () => {
    // arrange
    const onValueChange = () => {};

    // act
    renderUnits(onValueChange);

    // assert
    expect(
      screen.getByRole("radiogroup", { name: "How do you measure?" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "kg · cm" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "lb · in" })).not.toBeChecked();
  });

  it("checks the option a person picks and reports its value", async () => {
    // arrange
    const user = userEvent.setup();
    const chosen: string[] = [];
    renderUnits((value) => chosen.push(value));

    // act
    await user.click(screen.getByRole("radio", { name: "lb · in" }));

    // assert
    expect(screen.getByRole("radio", { name: "lb · in" })).toBeChecked();
    expect(chosen).toEqual(["imperial"]);
  });

  it("takes focus on the checked option, moves along the row with the arrow keys and checks with Space", async () => {
    // arrange
    const user = userEvent.setup();
    const chosen: string[] = [];
    renderUnits((value) => chosen.push(value));

    // act
    await user.tab();
    await user.keyboard("{ArrowRight}");
    await user.keyboard(" ");

    // assert
    expect(screen.getByRole("radio", { name: "lb · in" })).toHaveFocus();
    expect(screen.getByRole("radio", { name: "lb · in" })).toBeChecked();
    expect(chosen).toEqual(["imperial"]);
  });

  it("wraps from the last option back to the first", async () => {
    // arrange
    const user = userEvent.setup();
    renderUnits(() => {});
    await user.click(screen.getByRole("radio", { name: "lb · in" }));

    // act
    await user.keyboard("{ArrowRight}");
    await user.keyboard(" ");

    // assert
    expect(screen.getByRole("radio", { name: "kg · cm" })).toHaveFocus();
    expect(screen.getByRole("radio", { name: "kg · cm" })).toBeChecked();
  });

  it("marks the checked option with the primary fill", () => {
    // arrange
    const onValueChange = () => {};

    // act
    renderUnits(onValueChange);

    // assert
    expect(screen.getByRole("radio", { name: "kg · cm" })).toHaveClass(
      "data-[state=checked]:bg-primary",
      "data-[state=checked]:text-primary-foreground",
    );
  });
});
