import { describe, expect, it } from "vitest";

import type { ExerciseWire } from "~/features/exercises/contracts/exercises";

import {
  matchesExerciseFilters,
  toggleExerciseFilter,
  type ExerciseFilter,
} from "./exercise-filtering";

const baseWire: ExerciseWire = {
  id: "a",
  name: "Barbell Back Squat",
  description: "",
  difficulty: "Beginner",
  equipment: ["Barbell"],
  primaryMuscles: ["Quadriceps", "Glutes"],
  secondaryMuscles: [],
  tags: ["Strength", "Hypertrophy"],
  video: null,
  createdAt: "2026-09-02T00:00:00.000Z",
  updatedAt: "2026-09-02T00:00:00.000Z",
};
const squat = baseWire;
const plank: ExerciseWire = {
  ...baseWire,
  id: "b",
  name: "Plank",
  equipment: [],
  primaryMuscles: ["Core"],
  tags: ["Recovery"],
};
const pushUp: ExerciseWire = {
  ...baseWire,
  id: "c",
  name: "Push-Up",
  equipment: ["Bodyweight"],
  primaryMuscles: ["Chest"],
  tags: ["Hypertrophy"],
};
const library = [squat, plank, pushUp];

function filter(searchQuery: string, activeFilters: ExerciseFilter[]): string[] {
  return library
    .filter((exercise) =>
      matchesExerciseFilters({ activeFilters, exercise, searchQuery }),
    )
    .map((exercise) => exercise.name);
}

describe("matchesExerciseFilters", () => {
  it("returns everything when nothing is active", () => {
    // arrange, act, assert
    expect(filter("", [])).toEqual(["Barbell Back Squat", "Plank", "Push-Up"]);
  });

  it("narrows to one tag and widens when a second is added", () => {
    // arrange, act, assert
    expect(filter("", ["Recovery"])).toEqual(["Plank"]);
    expect(filter("", ["Recovery", "Strength"])).toEqual([
      "Barbell Back Squat",
      "Plank",
    ]);
  });

  it("treats no equipment and Bodyweight alike", () => {
    // arrange, act, assert
    expect(filter("", ["No equipment"])).toEqual(["Plank", "Push-Up"]);
  });

  it("intersects tags, equipment and search", () => {
    // arrange, act, assert
    expect(filter("", ["Hypertrophy", "No equipment"])).toEqual(["Push-Up"]);
    expect(filter("squat", ["Recovery"])).toEqual([]);
    expect(filter("core", [])).toEqual(["Plank"]);
  });
});

describe("toggleExerciseFilter", () => {
  it("adds and removes a filter", () => {
    // arrange, act, assert
    expect(toggleExerciseFilter([], "Strength")).toEqual(["Strength"]);
    expect(toggleExerciseFilter(["Strength"], "Strength")).toEqual([]);
  });
});
