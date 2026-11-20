import { describe, expect, it } from "vitest";

import type {
  ClientCoachingFacts,
  EquipmentOption,
} from "./client-coaching-port";
import { ProgramSetup, type ProgramSetupValues } from "./program-setup";

const FACTS: ClientCoachingFacts = {
  goal: "Lose fat",
  level: "beginner",
  trainingDays: 3,
  sessionMinutes: 60,
  equipment: ["Dumbbells", "Resistance bands"],
};

const EQUIPMENT_OPTIONS: EquipmentOption[] = [
  { value: "Full gym", exclusive: false },
  { value: "Dumbbells", exclusive: false },
  { value: "Resistance bands", exclusive: false },
  { value: "Bodyweight only", exclusive: true },
];

const VALUES: ProgramSetupValues = {
  goal: "Lose fat",
  level: "beginner",
  trainingDays: 3,
  sessionMinutes: 60,
  language: "en",
  dailySteps: 6000,
  splitShape: "full-body",
  equipment: ["Dumbbells"],
};

function validSetup(values: ProgramSetupValues): ProgramSetup {
  const result = ProgramSetup.from(values, EQUIPMENT_OPTIONS);
  if (result.status === "invalid") throw new Error("expected a valid setup");

  return result.setup;
}

describe("ProgramSetup.startingValues", () => {
  it("reads her coaching facts, in English, with the default daily steps and the split her days suggest", () => {
    // act
    const values = ProgramSetup.startingValues(FACTS);

    // assert
    expect(values).toEqual({
      goal: "Lose fat",
      level: "beginner",
      trainingDays: 3,
      sessionMinutes: 60,
      language: "en",
      dailySteps: 6000,
      splitShape: "full-body",
      equipment: ["Dumbbells", "Resistance bands"],
    });
  });

  it("follows the coach edits to her coaching facts", () => {
    // act
    const values = ProgramSetup.startingValues({
      ...FACTS,
      trainingDays: 4,
      level: "advanced",
    });

    // assert
    expect(values).toMatchObject({
      trainingDays: 4,
      splitShape: "upper-lower",
      level: "advanced",
    });
  });

  it("leaves the goal empty when her profile has no primary goal", () => {
    // act
    const values = ProgramSetup.startingValues({ ...FACTS, goal: null });

    // assert
    expect(values.goal).toBe("");
  });
});

describe("ProgramSetup.from", () => {
  it("accepts a setup with a goal and her equipment, its goal trimmed", () => {
    // act
    const result = ProgramSetup.from(
      { ...VALUES, goal: "  Build muscle " },
      EQUIPMENT_OPTIONS,
    );

    // assert
    expect(result.status === "valid" && result.setup.values).toEqual({
      ...VALUES,
      goal: "Build muscle",
    });
  });

  it("refuses a setup without a goal or without equipment, naming both", () => {
    // act
    const result = ProgramSetup.from(
      { ...VALUES, goal: "   ", equipment: [] },
      EQUIPMENT_OPTIONS,
    );

    // assert
    expect(result).toEqual({
      status: "invalid",
      problems: { goal: "missing", equipment: "missing" },
    });
  });

  it("refuses the exclusive equipment together with another choice", () => {
    // act
    const result = ProgramSetup.from(
      { ...VALUES, equipment: ["Bodyweight only", "Dumbbells"] },
      EQUIPMENT_OPTIONS,
    );

    // assert
    expect(result).toEqual({
      status: "invalid",
      problems: { equipment: "exclusive" },
    });
  });

  it("accepts the exclusive equipment on its own", () => {
    // act
    const result = ProgramSetup.from(
      { ...VALUES, equipment: ["Bodyweight only"] },
      EQUIPMENT_OPTIONS,
    );

    // assert
    expect(result.status).toBe("valid");
  });

  it("refuses equipment that is not among her options", () => {
    // act
    const result = ProgramSetup.from(
      { ...VALUES, equipment: ["Dumbbells", "Trampoline"] },
      EQUIPMENT_OPTIONS,
    );

    // assert
    expect(result).toEqual({
      status: "invalid",
      problems: { equipment: "unknown" },
    });
  });
});

describe("ProgramSetup.changesEquipment", () => {
  it("keeps the same choices in another order", () => {
    // arrange
    const setup = validSetup({
      ...VALUES,
      equipment: ["Resistance bands", "Dumbbells"],
    });

    // act
    const changes = setup.changesEquipment(["Dumbbells", "Resistance bands"]);

    // assert
    expect(changes).toBe(false);
  });

  it("changes when a choice is added or removed", () => {
    // arrange
    const setup = validSetup({ ...VALUES, equipment: ["Dumbbells"] });

    // act
    const changes = [
      setup.changesEquipment(["Dumbbells", "Resistance bands"]),
      setup.changesEquipment([]),
      setup.changesEquipment(["Full gym"]),
    ];

    // assert
    expect(changes).toEqual([true, true, true]);
  });
});
