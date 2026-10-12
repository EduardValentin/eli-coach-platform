import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChoiceGroup, ChoiceOption } from "./ChoiceGroup";

describe("ChoiceGroup", () => {
  it("sits at the small control size unless told otherwise", () => {
    // arrange
    // act
    render(
      <ChoiceGroup aria-label="Regularity" defaultValue="regular">
        <ChoiceOption value="regular">Regular</ChoiceOption>
      </ChoiceGroup>,
    );

    // assert
    expect(screen.getByRole("radiogroup", { name: "Regularity" })).toHaveAttribute("data-size", "sm");
  });

  it("takes the medium control size so it lines up with medium inputs and selects", () => {
    // arrange
    // act
    render(
      <ChoiceGroup size="md" aria-label="Sides" defaultValue="both">
        <ChoiceOption value="both">Both sides together</ChoiceOption>
        <ChoiceOption value="one">One side at a time</ChoiceOption>
      </ChoiceGroup>,
    );

    // assert
    expect(screen.getByRole("radiogroup", { name: "Sides" })).toHaveAttribute("data-size", "md");
    expect(screen.getByRole("radio", { name: "One side at a time" })).toHaveClass(
      "group-data-[size=md]/choice:h-[calc(var(--size-control-md)-8px)]",
    );
  });
});
