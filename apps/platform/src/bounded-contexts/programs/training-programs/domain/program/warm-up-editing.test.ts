import { describe, expect, it } from "vitest";

import type { LibraryExercise } from "./library-exercise";
import type { Session } from "./program-content";
import { WarmUpEditing } from "./warm-up-editing";

function mobility(
  id: string,
  overrides: Partial<LibraryExercise> = {},
): LibraryExercise {
  return {
    id,
    name: id,
    type: "mobility",
    unit: "reps",
    perSide: false,
    pattern: null,
    role: null,
    primaryMuscles: [],
    secondaryMuscles: [],
    equipment: [],
    tags: [],
    cues: "",
    videoPath: null,
    archived: false,
    ...overrides,
  };
}

const LIBRARY = [
  mobility("hips"),
  mobility("catCow", { unit: "time" }),
  mobility("worldsGreatest"),
  mobility("ankles"),
  mobility("thoracic"),
];

function warmUpEditing(): WarmUpEditing {
  let next = 0;

  return new WarmUpEditing({
    newId: () => `id-${(next += 1)}`,
    libraryExercises: LIBRARY,
  });
}

function emptySession(): Session {
  return {
    id: "s",
    originId: "s",
    name: "s",
    warmUp: { items: [] },
    coolDown: { enabled: false, items: [] },
    rows: [],
  };
}

function added(...ids: string[]): Session {
  const editing = warmUpEditing();

  return ids.reduce((session, id) => editing.add(session, id), emptySession());
}

describe("WarmUpEditing", () => {
  it("adds warm-up exercises as one set of reps or seconds, changes and removes them", () => {
    // arrange
    const withCatCow = added("hips", "catCow");
    const [hips, catCow] = withCatCow.warmUp.items;
    const editing = warmUpEditing();

    // act
    const twice = editing.add(withCatCow, "hips");
    const changed = editing.changeItem(withCatCow, { ...hips, sets: 2 });
    const removed = editing.remove(changed, catCow.id);

    // assert
    expect([hips, catCow]).toEqual([
      {
        id: expect.any(String),
        exerciseId: "hips",
        sets: 1,
        reps: { min: 10, max: 10 },
      },
      { id: expect.any(String), exerciseId: "catCow", sets: 1, seconds: 45 },
    ]);
    expect(twice).toEqual(withCatCow);
    expect(removed.warmUp.items).toEqual([{ ...hips, sets: 2 }]);
  });

  it("reorders warm-up exercises", () => {
    // arrange
    const start = added("hips", "catCow", "worldsGreatest");
    const [hips, , worldsGreatest] = start.warmUp.items;
    const order = (session: Session) =>
      session.warmUp.items.map((item) => item.exerciseId);
    const editing = warmUpEditing();

    // act
    const up = editing.moveUp(start, worldsGreatest.id);
    const down = editing.moveDown(start, hips.id);
    const beforeTheStart = editing.moveUp(start, hips.id);

    // assert
    expect(order(up)).toEqual(["hips", "worldsGreatest", "catCow"]);
    expect(order(down)).toEqual(["catCow", "hips", "worldsGreatest"]);
    expect(beforeTheStart).toEqual(start);
  });

  it("says why it refuses an exercise already in the warm-up or a fifth one", () => {
    // arrange
    const three = added("hips", "catCow", "worldsGreatest");
    const four = added("hips", "catCow", "worldsGreatest", "ankles");
    const editing = warmUpEditing();

    // act
    const repeated = editing.refusalFor(three, "catCow");
    const fourth = editing.refusalFor(three, "ankles");
    const fifth = editing.refusalFor(four, "thoracic");
    const repeatedInFour = editing.refusalFor(four, "hips");

    // assert
    expect(repeated).toBe("already-in-warm-up");
    expect(fourth).toBeUndefined();
    expect(fifth).toBe("warm-up-full");
    expect(repeatedInFour).toBe("already-in-warm-up");
  });

  it("holds four exercises at most", () => {
    // arrange
    const full = added("hips", "catCow", "worldsGreatest", "ankles");

    // act
    const fifth = warmUpEditing().add(full, "thoracic");

    // assert
    expect(fifth).toEqual(full);
  });
});
