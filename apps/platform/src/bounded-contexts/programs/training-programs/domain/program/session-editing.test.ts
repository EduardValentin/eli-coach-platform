import { describe, expect, it } from "vitest";

import type { LibraryExercise } from "./library-exercise";
import type { ExerciseRow, Session } from "./program-content";
import { SessionEditing } from "./session-editing";
import type { BlockType, Slot } from "./vocabulary";

function exercise(
  id: string,
  overrides: Partial<LibraryExercise> = {},
): LibraryExercise {
  return {
    id,
    name: id,
    type: "resistance",
    unit: "reps",
    perSide: false,
    pattern: "isolation",
    role: null,
    primaryMuscles: ["Glutes"],
    secondaryMuscles: [],
    equipment: [],
    tags: [],
    cues: `${id} cues`,
    videoPath: null,
    archived: false,
    ...overrides,
  };
}

const LIBRARY: LibraryExercise[] = [
  exercise("squat", { pattern: "squat" }),
  exercise("hinge", { pattern: "hinge" }),
  exercise("curl"),
  exercise("raise"),
  exercise("kickback"),
  exercise("plank", { pattern: "core", primaryMuscles: ["Core"] }),
  exercise("hips", { type: "mobility", pattern: null }),
  exercise("catCow", { type: "mobility", unit: "time", pattern: null }),
  exercise("hamstringStretch", {
    type: "stretching",
    unit: "time",
    pattern: null,
  }),
];

function sessionEditing(blockType: BlockType = "foundation"): SessionEditing {
  let next = 0;

  return new SessionEditing({
    newId: () => `id-${(next += 1)}`,
    blockType,
    libraryExercises: LIBRARY,
    libraryEquipment: [],
  });
}

function byId(id: string): LibraryExercise {
  return LIBRARY.find((item) => item.id === id) as LibraryExercise;
}

function emptySession(): Session {
  return {
    id: "session",
    originId: "session",
    name: "Full Body A",
    warmUp: { items: [] },
    coolDown: { enabled: false, items: [] },
    rows: [],
  };
}

function withExercises(...ids: [string, Slot][]): Session {
  const editing = sessionEditing();

  return ids.reduce(
    (session, [id, slot]) => editing.add(session, byId(id), { slot }),
    emptySession(),
  );
}

/** Each row as the builder labels it: its slot, numbered within a superset. */
function layout(session: Session): string[] {
  return session.rows.map((row) => {
    const group = session.rows.filter(
      (other) =>
        row.supersetGroup !== undefined &&
        other.slot === row.slot &&
        other.supersetGroup === row.supersetGroup,
    );
    const label =
      group.length < 2
        ? row.slot
        : `${row.slot}${group.findIndex((other) => other.id === row.id) + 1}`;

    return `${label}:${row.exerciseId}`;
  });
}

function rowOf(session: Session, exerciseId: string): ExerciseRow {
  return session.rows.find(
    (row) => row.exerciseId === exerciseId,
  ) as ExerciseRow;
}

describe("SessionEditing", () => {
  it("adds an exercise with block defaults, cues and substitutions", () => {
    // arrange
    const session = emptySession();

    // act
    const next = sessionEditing().add(session, byId("curl"), { slot: "C" });

    // assert
    const [row] = next.rows;
    expect(row).toMatchObject({
      slot: "C",
      exerciseId: "curl",
      cues: "curl cues",
      restSeconds: 75,
    });
    expect(row.startSets.filter((set) => set.kind === "working")).toHaveLength(
      3,
    );
    expect(row.substitutions).toEqual(["raise", "kickback"]);
  });

  it("sends a second exercise for a one-card slot to the next group", () => {
    // arrange
    const session = withExercises(["squat", "A"]);

    // act
    const next = sessionEditing().add(session, byId("hinge"), { slot: "A" });

    // assert
    expect(layout(next)).toEqual(["A:squat", "B:hinge"]);
  });

  it("keeps rows in slot order whatever the order of adding", () => {
    // arrange / act
    const session = withExercises(
      ["plank", "D"],
      ["curl", "C"],
      ["squat", "A"],
    );

    // assert
    expect(layout(session)).toEqual(["A:squat", "C:curl", "D:plank"]);
  });

  it("inserts before a given card of the group", () => {
    // arrange
    const session = withExercises(["curl", "C"], ["raise", "C"]);

    // act
    const next = sessionEditing().add(session, byId("kickback"), {
      slot: "C",
      beforeRowId: rowOf(session, "raise").id,
    });

    // assert
    expect(layout(next)).toEqual(["C:curl", "C:kickback", "C:raise"]);
  });

  it("forms a superset when a card lands on another accessory and labels them C1 and C2", () => {
    // arrange
    const session = withExercises(
      ["curl", "C"],
      ["plank", "D"],
      ["raise", "C"],
    );

    // act
    const next = sessionEditing().supersetOnto(
      session,
      rowOf(session, "plank").id,
      rowOf(session, "curl").id,
    );

    // assert
    expect(layout(next)).toEqual(["C1:curl", "C2:plank", "C:raise"]);
  });

  it("joins a library exercise dropped on an accessory to its superset", () => {
    // arrange
    const session = withExercises(["curl", "C"]);

    // act
    const next = sessionEditing().addOnto(
      session,
      byId("raise"),
      rowOf(session, "curl").id,
    );

    // assert
    expect(layout(next)).toEqual(["C1:curl", "C2:raise"]);
  });

  it("swaps the main lift and the secondary with their slots", () => {
    // arrange
    const session = withExercises(["squat", "A"], ["hinge", "B"]);

    // act
    const next = sessionEditing().swap(
      session,
      rowOf(session, "hinge").id,
      rowOf(session, "squat").id,
    );

    // assert
    expect(layout(next)).toEqual(["A:hinge", "B:squat"]);
    expect(
      rowOf(next, "hinge").startSets.filter((set) => set.kind === "working"),
    ).toHaveLength(3);
  });

  it("moves a card out of a superset and dissolves a group of one", () => {
    // arrange
    const paired = withExercises(["curl", "C"], ["raise", "C"]);
    const session = sessionEditing().supersetWithNext(
      paired,
      paired.rows[0].id,
    );

    // act
    const next = sessionEditing().move(session, rowOf(session, "raise").id, {
      slot: "D",
    });

    // assert
    expect(layout(next)).toEqual(["C:curl", "D:raise"]);
    expect(next.rows.every((row) => row.supersetGroup === undefined)).toBe(
      true,
    );
  });

  it("moves up across groups by trading places", () => {
    // arrange
    const session = withExercises(["squat", "A"], ["curl", "C"]);

    // act
    const next = sessionEditing().moveUp(session, rowOf(session, "curl").id);

    // assert
    expect(layout(next)).toEqual(["A:curl", "C:squat"]);
  });

  it("ungroups a superset", () => {
    // arrange
    const paired = withExercises(["curl", "C"], ["raise", "C"]);
    const session = sessionEditing().supersetWithNext(
      paired,
      paired.rows[0].id,
    );

    // act
    const next = sessionEditing().ungroup(
      session,
      session.rows[0].supersetGroup as string,
    );

    // assert
    expect(layout(next)).toEqual(["C:curl", "C:raise"]);
  });

  it("groups consecutive superset members into one unit", () => {
    // arrange
    const three = withExercises(
      ["curl", "C"],
      ["raise", "C"],
      ["kickback", "C"],
    );
    const session = sessionEditing().supersetWithNext(three, three.rows[0].id);

    // act
    const units = sessionEditing().slotUnits(session, "C");

    // assert
    expect(units.map((unit) => unit.rows.map((row) => row.exerciseId))).toEqual(
      [["curl", "raise"], ["kickback"]],
    );
  });

  it("groups the whole session into slot units in order", () => {
    // arrange
    const four = withExercises(
      ["squat", "A"],
      ["curl", "C"],
      ["raise", "C"],
      ["plank", "D"],
    );
    const session = sessionEditing().supersetWithNext(
      four,
      rowOf(four, "curl").id,
    );

    // act
    const units = sessionEditing().sessionUnits(session);

    // assert
    expect(units.map((unit) => unit.rows.map((row) => row.exerciseId))).toEqual(
      [["squat"], ["curl", "raise"], ["plank"]],
    );
  });

  it("keeps the sets of a row moved to another group in a deload block", () => {
    // arrange
    const deload = sessionEditing("deload");
    const added = deload.add(emptySession(), byId("curl"), { slot: "C" });
    const sets: Pick<ExerciseRow, "startSets"> = {
      startSets: [
        {
          id: "warm-up",
          kind: "warm-up",
          start: { reps: { min: 8, max: 8 }, rir: 4 },
        },
        {
          id: "working",
          kind: "working",
          start: { reps: { min: 10, max: 12 }, rir: 4, weightKg: 17 },
        },
      ],
    };
    const session = deload.replaceRow(added, { ...added.rows[0], ...sets });

    // act
    const moved = deload.move(session, session.rows[0].id, {
      slot: "D",
    });
    const swapped = deload.moveUp(
      deload.add(moved, byId("squat"), { slot: "A" }),
      moved.rows[0].id,
    );

    // assert
    expect(layout(moved)).toEqual(["D:curl"]);
    expect(rowOf(moved, "curl")).toMatchObject(sets);
    expect(rowOf(swapped, "curl").slot).toBe("A");
    expect(rowOf(swapped, "curl")).toMatchObject(sets);
  });

  it("removes a substitution and marks the substitutions as touched", () => {
    // arrange
    const session = withExercises(["curl", "C"]);
    const rowId = session.rows[0].id;

    // act
    const next = sessionEditing().removeSubstitution(session, rowId, "raise");

    // assert
    expect(next.rows[0].substitutions).toEqual(["kickback"]);
    expect(next.rows[0].touched).toContain("substitutions");
  });

  it("adds a substitution only when it is neither the row's exercise nor already listed, and keeps two at most", () => {
    // arrange
    const filled = withExercises(["curl", "C"]);
    const rowId = filled.rows[0].id;
    const editing = sessionEditing();
    const session = editing.removeSubstitution(filled, rowId, "kickback");

    // act
    const own = editing.addSubstitution(session, rowId, "curl");
    const repeated = editing.addSubstitution(session, rowId, "raise");
    const second = editing.addSubstitution(session, rowId, "squat");
    const third = editing.addSubstitution(second, rowId, "hinge");

    // assert
    expect(own.rows[0].substitutions).toEqual(["raise"]);
    expect(repeated.rows[0].substitutions).toEqual(["raise"]);
    expect(second.rows[0].substitutions).toEqual(["raise", "squat"]);
    expect(third.rows[0].substitutions).toEqual(["raise", "squat"]);
  });

  it("offers a superset with the next row only between two accessory rows not already together", () => {
    // arrange
    const session = withExercises(
      ["squat", "A"],
      ["hinge", "B"],
      ["curl", "C"],
      ["raise", "C"],
    );
    const editing = sessionEditing();
    const paired = editing.supersetWithNext(session, rowOf(session, "curl").id);

    // act
    const answers = [
      editing.canSupersetWithNext(session, rowOf(session, "squat").id),
      editing.canSupersetWithNext(session, rowOf(session, "curl").id),
      editing.canSupersetWithNext(paired, rowOf(paired, "curl").id),
      editing.canSupersetWithNext(session, rowOf(session, "raise").id),
    ];

    // assert
    expect(answers).toEqual([false, true, false, false]);
  });

  it("clears the exercise rows and keeps the warm-up and cool-down", () => {
    // arrange
    const session = {
      ...withExercises(["squat", "A"], ["curl", "C"]),
      warmUp: {
        items: [{ id: "w1", exerciseId: "hips", sets: 1, seconds: 45 }],
      },
    };

    // act
    const cleared = sessionEditing().clear(session);

    // assert
    expect(cleared).toEqual({ ...session, rows: [] });
  });
});
