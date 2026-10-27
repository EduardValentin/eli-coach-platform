import { describe, expect, it } from "vitest";

import {
  countExercisesByStatus,
  ExerciseSelection,
  sortExercises,
} from "./exercise-listing";
import type { ExerciseSnapshot } from "./exercise";

type Item = Pick<
  ExerciseSnapshot,
  "name" | "type" | "tags" | "equipment" | "primaryMuscles" | "difficulty"
>;

function item(overrides: Partial<Item> & Pick<Item, "name">): Item {
  return {
    type: "resistance",
    tags: [],
    equipment: [],
    primaryMuscles: ["Core"],
    difficulty: "Beginner",
    ...overrides,
  };
}

const backSquat = item({
  name: "Back squat",
  tags: ["Strength"],
  equipment: ["Barbell", "Squat rack"],
  primaryMuscles: ["Quadriceps", "Glutes"],
  difficulty: "Intermediate",
});
const hipThrust = item({
  name: "Hip thrust",
  tags: ["Strength", "Hypertrophy"],
  equipment: ["Bench"],
  primaryMuscles: ["Glutes"],
  difficulty: "Advanced",
});
const airSquat = item({
  name: "Air squat",
  tags: ["Strength"],
  primaryMuscles: ["Quadriceps"],
});
const catCow = item({
  name: "Cat cow",
  type: "mobility",
  tags: ["Recovery"],
  primaryMuscles: ["Core", "Upper back"],
});
const easyRun = item({
  name: "Easy run",
  type: "cardio",
  equipment: ["Treadmill"],
  primaryMuscles: ["Full body"],
});
const library = [backSquat, hipThrust, airSquat, catCow, easyRun];

function namesOf(items: readonly Item[]): string[] {
  return items.map((exercise) => exercise.name);
}

function matchingNames(selection: ExerciseSelection): string[] {
  return namesOf(library.filter((exercise) => selection.matches(exercise)));
}

describe("ExerciseSelection", () => {
  describe("none and parse", () => {
    it("selects nothing and is not active", () => {
      // arrange
      const selection = ExerciseSelection.none();

      // act
      const snapshot = selection.toSnapshot();

      // assert
      expect(snapshot).toEqual({
        type: "any",
        tags: [],
        equipment: "any",
        query: "",
      });
      expect(selection.isActive()).toBe(false);
      expect(matchingNames(selection)).toEqual(namesOf(library));
    });

    it("keeps known values as given", () => {
      // arrange
      const input = {
        type: "cardio",
        tags: ["Recovery", "Strength"],
        equipment: "none",
        query: " Run ",
      };

      // act
      const selection = ExerciseSelection.parse(input);

      // assert
      expect(selection.toSnapshot()).toEqual({
        type: "cardio",
        tags: ["Recovery", "Strength"],
        equipment: "none",
        query: " Run ",
      });
      expect(selection.isActive()).toBe(true);
    });

    it("falls back to any for an unknown type and unknown equipment", () => {
      // arrange
      const input = {
        type: "plyometric",
        tags: [],
        equipment: "all",
        query: "",
      };

      // act
      const selection = ExerciseSelection.parse(input);

      // assert
      expect(selection.type).toBe("any");
      expect(selection.equipment).toBe("any");
      expect(selection.isActive()).toBe(false);
    });

    it("falls back to any for a missing type and missing equipment", () => {
      // arrange
      const input = { type: null, tags: [], equipment: null, query: "" };

      // act
      const selection = ExerciseSelection.parse(input);

      // assert
      expect(selection.type).toBe("any");
      expect(selection.equipment).toBe("any");
    });

    it("drops one unknown tag among known ones and keeps the order", () => {
      // arrange
      const input = {
        type: null,
        tags: ["Recovery", "Cardio blast", "Strength"],
        equipment: null,
        query: "",
      };

      // act
      const selection = ExerciseSelection.parse(input);

      // assert
      expect(selection.tags).toEqual(["Recovery", "Strength"]);
    });

    it("is not active for a query made only of spaces", () => {
      // arrange
      const selection = ExerciseSelection.none().withQuery("   ");

      // act
      const active = selection.isActive();

      // assert
      expect(active).toBe(false);
    });
  });

  describe("matches", () => {
    it("matches by type alone", () => {
      // arrange
      const selection = ExerciseSelection.none().withType("resistance");

      // act
      const names = matchingNames(selection);

      // assert
      expect(names).toEqual(["Back squat", "Hip thrust", "Air squat"]);
    });

    it("matches an exercise holding any of the chosen tags", () => {
      // arrange
      const selection = ExerciseSelection.none()
        .withTagToggled("Hypertrophy")
        .withTagToggled("Recovery");

      // act
      const names = matchingNames(selection);

      // assert
      expect(names).toEqual(["Hip thrust", "Cat cow"]);
    });

    it("matches no-equipment as an empty equipment list", () => {
      // arrange
      const selection = ExerciseSelection.none().withEquipment("none");

      // act
      const names = matchingNames(selection);

      // assert
      expect(names).toEqual(["Air squat", "Cat cow"]);
    });

    it("matches a partial, case-insensitive, trimmed name", () => {
      // arrange
      const selection = ExerciseSelection.none().withQuery("  SQUAT ");

      // act
      const names = matchingNames(selection);

      // assert
      expect(names).toEqual(["Back squat", "Air squat"]);
    });

    it("matches a primary muscle", () => {
      // arrange
      const selection = ExerciseSelection.none().withQuery("glute");

      // act
      const names = matchingNames(selection);

      // assert
      expect(names).toEqual(["Back squat", "Hip thrust"]);
    });

    it("matches every filter together", () => {
      // arrange
      const selection = ExerciseSelection.none()
        .withType("resistance")
        .withTagToggled("Strength")
        .withEquipment("none")
        .withQuery("quad");

      // act
      const names = matchingNames(selection);

      // assert
      expect(names).toEqual(["Air squat"]);
    });

    it("matches nothing when the filters exclude each other", () => {
      // arrange
      const selection = ExerciseSelection.none()
        .withType("cardio")
        .withTagToggled("Strength");

      // act
      const names = matchingNames(selection);

      // assert
      expect(names).toEqual([]);
    });
  });

  describe("counts", () => {
    it("counts every type under the whole library", () => {
      // arrange
      const selection = ExerciseSelection.none();

      // act
      const counts = selection.countsByType(library);

      // assert
      expect(counts).toEqual({
        any: 5,
        resistance: 3,
        cardio: 1,
        mobility: 1,
        stretching: 0,
        breathing: 0,
      });
    });

    it("counts types under the tags, equipment and search but not under the type itself", () => {
      // arrange
      const selection = ExerciseSelection.none()
        .withType("cardio")
        .withTagToggled("Strength")
        .withQuery("squat");

      // act
      const counts = selection.countsByType(library);

      // assert
      expect(counts).toEqual({
        any: 2,
        resistance: 2,
        cardio: 0,
        mobility: 0,
        stretching: 0,
        breathing: 0,
      });
    });

    it("counts tags under the type, equipment and search but not under the tags themselves", () => {
      // arrange
      const selection = ExerciseSelection.none()
        .withType("resistance")
        .withTagToggled("Recovery")
        .withQuery("squat");

      // act
      const counts = selection.countsByTag(library);

      // assert
      expect(counts).toEqual({ Strength: 2, Hypertrophy: 0, Recovery: 0 });
    });

    it("counts equipment under the type, tags and search but not under the equipment itself", () => {
      // arrange
      const selection = ExerciseSelection.none()
        .withEquipment("none")
        .withTagToggled("Strength");

      // act
      const counts = selection.countsByEquipment(library);

      // assert
      expect(counts).toEqual({ any: 3, none: 1 });
    });

    it("counts equipment under the search", () => {
      // arrange
      const selection = ExerciseSelection.none().withQuery("squat");

      // act
      const counts = selection.countsByEquipment(library);

      // assert
      expect(counts).toEqual({ any: 2, none: 1 });
    });
  });

  describe("copies", () => {
    it("returns a new selection and leaves the original untouched", () => {
      // arrange
      const original = ExerciseSelection.none();

      // act
      const changed = original
        .withType("mobility")
        .withTagToggled("Recovery")
        .withEquipment("none")
        .withQuery("cat");

      // assert
      expect(changed.toSnapshot()).toEqual({
        type: "mobility",
        tags: ["Recovery"],
        equipment: "none",
        query: "cat",
      });
      expect(original.toSnapshot()).toEqual({
        type: "any",
        tags: [],
        equipment: "any",
        query: "",
      });
    });

    it("toggles a tag on and off", () => {
      // arrange
      const withStrength = ExerciseSelection.none().withTagToggled("Strength");

      // act
      const toggledOff = withStrength.withTagToggled("Strength");

      // assert
      expect(withStrength.tags).toEqual(["Strength"]);
      expect(toggledOff.tags).toEqual([]);
    });

    it("adds a toggled tag after the ones already chosen", () => {
      // arrange
      const selection = ExerciseSelection.none().withTagToggled("Recovery");

      // act
      const toggled = selection.withTagToggled("Strength");

      // assert
      expect(toggled.tags).toEqual(["Recovery", "Strength"]);
    });
  });
});

describe("sortExercises", () => {
  const sortable = [backSquat, hipThrust, airSquat, catCow, easyRun];

  it("sorts by name ascending", () => {
    // arrange
    const sort = { key: "name", direction: "asc" } as const;

    // act
    const sorted = sortExercises(sortable, sort);

    // assert
    expect(namesOf(sorted)).toEqual([
      "Air squat",
      "Back squat",
      "Cat cow",
      "Easy run",
      "Hip thrust",
    ]);
  });

  it("sorts by name descending", () => {
    // arrange
    const sort = { key: "name", direction: "desc" } as const;

    // act
    const sorted = sortExercises(sortable, sort);

    // assert
    expect(namesOf(sorted)).toEqual([
      "Hip thrust",
      "Easy run",
      "Cat cow",
      "Back squat",
      "Air squat",
    ]);
  });

  it("sorts names ignoring case and accents", () => {
    // arrange
    const names = [
      item({ name: "zercher" }),
      item({ name: "Écarté" }),
      item({ name: "Arnold" }),
    ];

    // act
    const sorted = sortExercises(names, { key: "name", direction: "asc" });

    // assert
    expect(namesOf(sorted)).toEqual(["Arnold", "Écarté", "zercher"]);
  });

  it("sorts by difficulty ascending with the name breaking ties", () => {
    // arrange
    const sort = { key: "difficulty", direction: "asc" } as const;

    // act
    const sorted = sortExercises(sortable, sort);

    // assert
    expect(namesOf(sorted)).toEqual([
      "Air squat",
      "Cat cow",
      "Easy run",
      "Back squat",
      "Hip thrust",
    ]);
  });

  it("sorts by difficulty descending reversing the tie-break too", () => {
    // arrange
    const sort = { key: "difficulty", direction: "desc" } as const;

    // act
    const sorted = sortExercises(sortable, sort);

    // assert
    expect(namesOf(sorted)).toEqual([
      "Hip thrust",
      "Back squat",
      "Easy run",
      "Cat cow",
      "Air squat",
    ]);
  });

  it("returns a new array and leaves the input order alone", () => {
    // arrange
    const input = [...sortable];

    // act
    const sorted = sortExercises(input, { key: "name", direction: "asc" });

    // assert
    expect(sorted).not.toBe(input);
    expect(input).toEqual(sortable);
  });
});

describe("countExercisesByStatus", () => {
  it("counts the exercises of each status", () => {
    // arrange
    const items = [
      { status: "active" as const },
      { status: "archived" as const },
      { status: "active" as const },
    ];

    // act
    const counts = countExercisesByStatus(items);

    // assert
    expect(counts).toEqual({ active: 2, archived: 1 });
  });

  it("counts none of either status in an empty list", () => {
    // arrange
    const items: { status: "active" | "archived" }[] = [];

    // act
    const counts = countExercisesByStatus(items);

    // assert
    expect(counts).toEqual({ active: 0, archived: 0 });
  });
});
