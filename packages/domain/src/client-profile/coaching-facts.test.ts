import { describe, expect, it } from "vitest";

import {
  CoachingFacts,
  type CoachingFactsProblems,
  type CoachingFactsSnapshot,
} from "./coaching-facts";

const FACTS: CoachingFactsSnapshot = {
  heightCm: 168,
  trainingDays: 3,
  sessionMinutes: 60,
  equipment: ["Full gym", "Dumbbells"],
  trainingPlace: "Gym",
  limitations: "Right shoulder aches on overhead pressing.",
  level: "beginner",
  primaryGoal: "Lose fat",
  goalWeightKg: 62,
  activityLevel: "Mostly sitting",
  cycleMode: "adapted",
  dietaryRestrictions: "Vegetarian",
};

describe("CoachingFacts.of", () => {
  it("holds facts that follow the profile rules, trimmed", () => {
    // arrange
    const entered = {
      ...FACTS,
      limitations: "  Right shoulder aches on overhead pressing.  ",
      dietaryRestrictions: " Vegetarian ",
    };

    // act
    const result = CoachingFacts.of(entered);

    // assert
    expect(result.status).toBe("valid");
    expect(result.status === "valid" && result.facts.toSnapshot()).toEqual(
      FACTS,
    );
  });

  it("accepts a profile with no height, place, goal, goal weight or activity yet", () => {
    // arrange
    const entered = {
      ...FACTS,
      heightCm: null,
      trainingPlace: null,
      primaryGoal: null,
      goalWeightKg: null,
      activityLevel: null,
      equipment: [],
      limitations: "",
    };

    // act
    const result = CoachingFacts.of(entered);

    // assert
    expect(result.status).toBe("valid");
  });

  it.each([
    [
      "a height under 120 cm",
      { heightCm: 119.5 },
      { heightCm: "out-of-range" },
    ],
    ["a height over 230 cm", { heightCm: 230.5 }, { heightCm: "out-of-range" }],
    [
      "a goal weight under 30 kg",
      { goalWeightKg: 29.9 },
      { goalWeightKg: "out-of-range" },
    ],
    [
      "a goal weight over 300 kg",
      { goalWeightKg: 300.1 },
      { goalWeightKg: "out-of-range" },
    ],
    [
      "bodyweight only beside other equipment",
      { equipment: ["Bodyweight only", "Dumbbells"] },
      { equipment: "exclusive" },
    ],
    [
      "limitations over 500 characters",
      { limitations: "a".repeat(501) },
      { limitations: "too-long" },
    ],
    [
      "blank dietary restrictions",
      { dietaryRestrictions: "   " },
      { dietaryRestrictions: "missing" },
    ],
  ] satisfies [
    string,
    Partial<CoachingFactsSnapshot>,
    CoachingFactsProblems,
  ][])("names the problem with %s", (_label, change, problems) => {
    // arrange
    const entered = { ...FACTS, ...change };

    // act
    const result = CoachingFacts.of(entered);

    // assert
    expect(result).toEqual({ status: "invalid", problems });
  });

  it("keeps bodyweight only when it is her one piece of equipment", () => {
    // arrange
    const entered: CoachingFactsSnapshot = {
      ...FACTS,
      equipment: ["Bodyweight only"],
    };

    // act
    const result = CoachingFacts.of(entered);

    // assert
    expect(result.status).toBe("valid");
  });
});

describe("CoachingFacts.seeded", () => {
  it("keeps facts that already follow the profile rules as they are", () => {
    // arrange
    // act
    const facts = CoachingFacts.seeded(FACTS);

    // assert
    expect(facts.toSnapshot()).toEqual(FACTS);
  });

  it("brings answers that break a profile rule within the rules", () => {
    // arrange
    const answered = {
      ...FACTS,
      heightCm: 300,
      goalWeightKg: 10,
      equipment: ["Bodyweight only", "Dumbbells"],
      limitations: `  ${"a".repeat(520)}`,
      dietaryRestrictions: "  ",
    } satisfies CoachingFactsSnapshot;

    // act
    const facts = CoachingFacts.seeded(answered);

    // assert
    expect(facts.toSnapshot()).toEqual({
      ...FACTS,
      heightCm: null,
      goalWeightKg: null,
      equipment: ["Dumbbells"],
      limitations: "a".repeat(500),
      dietaryRestrictions: "None",
    });
    expect(CoachingFacts.of(facts.toSnapshot()).status).toBe("valid");
  });
});

describe("CoachingFacts#toSnapshot", () => {
  it("hands back plain data with a copy of her equipment", () => {
    // arrange
    const facts = CoachingFacts.seeded(FACTS);

    // act
    const snapshot = facts.toSnapshot();
    snapshot.equipment.push("Barbell");

    // assert
    expect(facts.toSnapshot().equipment).toEqual(["Full gym", "Dumbbells"]);
  });
});
