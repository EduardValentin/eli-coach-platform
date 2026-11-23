import { describe, expect, it } from "vitest";

import { equipmentChangeLines } from "./equipment-change";

const OPTIONS = [
  { value: "Full gym", exclusive: false },
  { value: "Machines", exclusive: false },
  { value: "Barbell", exclusive: false },
  { value: "Dumbbells", exclusive: false },
  { value: "Kettlebells", exclusive: false },
  { value: "Resistance bands", exclusive: false },
  { value: "Bodyweight only", exclusive: true },
];

describe("equipmentChangeLines", () => {
  it("has no lines when the chosen equipment is the profile equipment, in any order", () => {
    // arrange, act
    const lines = equipmentChangeLines(
      OPTIONS,
      ["Full gym", "Dumbbells"],
      ["Dumbbells", "Full gym"],
    );

    // assert
    expect(lines).toEqual([]);
  });

  it("names additions only, in the order of the equipment options", () => {
    // arrange, act
    const lines = equipmentChangeLines(
      OPTIONS,
      ["Full gym"],
      ["Kettlebells", "Full gym", "Dumbbells"],
    );

    // assert
    expect(lines).toEqual([
      { label: "Adding", names: ["Dumbbells", "Kettlebells"] },
    ]);
  });

  it("names removals only", () => {
    // arrange, act
    const lines = equipmentChangeLines(
      OPTIONS,
      ["Full gym", "Dumbbells"],
      ["Dumbbells"],
    );

    // assert
    expect(lines).toEqual([{ label: "Removing", names: ["Full gym"] }]);
  });

  it("names the addition before the removal when both happen", () => {
    // arrange, act
    const lines = equipmentChangeLines(
      OPTIONS,
      ["Full gym", "Dumbbells"],
      ["Dumbbells", "Kettlebells"],
    );

    // assert
    expect(lines).toEqual([
      { label: "Adding", names: ["Kettlebells"] },
      { label: "Removing", names: ["Full gym"] },
    ]);
  });

  it("says she is switching to the exclusive option, then what that removes", () => {
    // arrange, act
    const lines = equipmentChangeLines(
      OPTIONS,
      ["Dumbbells", "Full gym"],
      ["Bodyweight only"],
    );

    // assert
    expect(lines).toEqual([
      { label: "Switching to", names: ["Bodyweight only"] },
      { label: "Removing", names: ["Full gym", "Dumbbells"] },
    ]);
  });

  it("adds the equipment, then removes the exclusive option, when her profile held it", () => {
    // arrange, act
    const lines = equipmentChangeLines(
      OPTIONS,
      ["Bodyweight only"],
      ["Machines", "Barbell"],
    );

    // assert
    expect(lines).toEqual([
      { label: "Adding", names: ["Machines", "Barbell"] },
      { label: "Removing", names: ["Bodyweight only"] },
    ]);
  });

  it("only adds when her profile held nothing", () => {
    // arrange, act
    const lines = equipmentChangeLines(OPTIONS, [], ["Full gym", "Barbell"]);

    // assert
    expect(lines).toEqual([
      { label: "Adding", names: ["Full gym", "Barbell"] },
    ]);
  });

  it("only switches to the exclusive option when her profile held nothing", () => {
    // arrange, act
    const lines = equipmentChangeLines(OPTIONS, [], ["Bodyweight only"]);

    // assert
    expect(lines).toEqual([
      { label: "Switching to", names: ["Bodyweight only"] },
    ]);
  });
});
