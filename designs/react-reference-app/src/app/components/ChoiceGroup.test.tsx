import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChoiceGroup, ChoiceOption } from "./ChoiceGroup";

describe("ChoiceGroup", () => {
  it("keeps its options the inner height of a field so the group lines up with fields", () => {
    // arrange
    // act
    render(
      <ChoiceGroup aria-label="Sides" defaultValue="both">
        <ChoiceOption value="both">Both sides together</ChoiceOption>
        <ChoiceOption value="one">One side at a time</ChoiceOption>
      </ChoiceGroup>,
    );

    // assert
    expect(screen.getByRole("radio", { name: "One side at a time" })).toHaveClass("min-h-[calc(var(--size-control-md)-8px)]");
  });
});
