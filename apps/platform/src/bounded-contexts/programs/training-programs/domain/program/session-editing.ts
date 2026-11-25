import type { Equipment, LibraryExercise } from "./library-exercise";
import {
  MAX_SUBSTITUTIONS,
  SINGLE_UNIT_SLOTS,
  type ExerciseRow,
  type Session,
} from "./program-content";
import { RowDefaults } from "./row-defaults";
import { Substitutions } from "./substitutions";
import { SLOTS, type BlockType, type Slot } from "./vocabulary";

export type Placement = { slot: Slot; beforeRowId?: string };

/** A slot group's rows as the builder shows them: one row, or the rows of one superset. */
export type SlotUnit = { key: string; group?: string; rows: ExerciseRow[] };

type SessionEditingOptions = {
  newId: () => string;
  blockType: BlockType;
  libraryExercises: readonly LibraryExercise[];
  equipment: readonly Equipment[];
};

type RowPlacement = { slot: Slot; supersetGroup?: string };

/** The coach's edits of a session's exercise rows (Business Rule 35); each answers the edited session. */
export class SessionEditing {
  private readonly rowDefaults: RowDefaults;

  constructor(private readonly options: SessionEditingOptions) {
    this.rowDefaults = new RowDefaults(options);
  }

  slotUnits(session: Session, slot: Slot): SlotUnit[] {
    return SessionEditing.unitsOf(
      session.rows.filter((row) => row.slot === slot),
    );
  }

  sessionUnits(session: Session): SlotUnit[] {
    return SessionEditing.unitsOf(session.rows);
  }

  add(
    session: Session,
    exercise: LibraryExercise,
    placement: Placement,
  ): Session {
    const slot = SessionEditing.openSlot(session.rows, placement.slot);
    const beforeRowId =
      slot === placement.slot ? placement.beforeRowId : undefined;

    return SessionEditing.withRows(
      session,
      SessionEditing.inserted(session.rows, {
        row: this.filledRow(exercise, { slot }),
        beforeRowId,
      }),
    );
  }

  move(session: Session, rowId: string, placement: Placement): Session {
    const row = SessionEditing.rowOf(session, rowId);
    if (!row || row.id === placement.beforeRowId) return session;
    const rest = session.rows.filter((other) => other.id !== rowId);
    const slot = SessionEditing.openSlot(rest, placement.slot);
    const moved = { ...SessionEditing.inGroup(row, undefined), slot };

    return SessionEditing.withRows(
      session,
      SessionEditing.inserted(rest, {
        row: moved,
        beforeRowId:
          slot === placement.slot ? placement.beforeRowId : undefined,
      }),
    );
  }

  /** A library exercise dropped on a row: a superset with it in an accessory slot, the next open slot otherwise. */
  addOnto(
    session: Session,
    exercise: LibraryExercise,
    targetRowId: string,
  ): Session {
    const target = SessionEditing.rowOf(session, targetRowId);
    if (!target) return session;
    if (SINGLE_UNIT_SLOTS.includes(target.slot)) {
      return this.add(session, exercise, { slot: target.slot });
    }
    const group = target.supersetGroup ?? this.options.newId();
    const grouped = session.rows.map((row) =>
      row.id === targetRowId ? SessionEditing.inGroup(row, group) : row,
    );
    const added = this.filledRow(exercise, {
      slot: target.slot,
      supersetGroup: group,
    });

    return SessionEditing.withRows(
      session,
      SessionEditing.insertedAfter(grouped, added, targetRowId),
    );
  }

  /** A row dropped on another: a superset in an accessory slot, a swap with a main lift or secondary. */
  supersetOnto(session: Session, rowId: string, targetRowId: string): Session {
    const row = SessionEditing.rowOf(session, rowId);
    const target = SessionEditing.rowOf(session, targetRowId);
    if (!row || !target || row === target) return session;
    if (SINGLE_UNIT_SLOTS.includes(target.slot)) {
      return this.swap(session, rowId, targetRowId);
    }
    const group = target.supersetGroup ?? this.options.newId();
    const rest = session.rows
      .filter((other) => other.id !== rowId)
      .map((other) =>
        other.id === targetRowId ? SessionEditing.inGroup(other, group) : other,
      );
    const joined = { ...SessionEditing.inGroup(row, group), slot: target.slot };

    return SessionEditing.withRows(
      session,
      SessionEditing.insertedAfter(rest, joined, targetRowId),
    );
  }

  /** Two rows trade places, each taking the other's slot and superset. */
  swap(session: Session, rowId: string, otherId: string): Session {
    const row = SessionEditing.rowOf(session, rowId);
    const other = SessionEditing.rowOf(session, otherId);
    if (!row || !other || row === other) return session;
    const next = [...session.rows];
    next[session.rows.indexOf(row)] = SessionEditing.inGroup(
      { ...other, slot: row.slot },
      row.supersetGroup,
    );
    next[session.rows.indexOf(other)] = SessionEditing.inGroup(
      { ...row, slot: other.slot },
      other.supersetGroup,
    );

    return SessionEditing.withRows(session, next);
  }

  moveUp(session: Session, rowId: string): Session {
    const previous = SessionEditing.neighbour(session, rowId, -1);

    return previous ? this.swap(session, rowId, previous.id) : session;
  }

  moveDown(session: Session, rowId: string): Session {
    const next = SessionEditing.neighbour(session, rowId, 1);

    return next ? this.swap(session, rowId, next.id) : session;
  }

  canSupersetWithNext(session: Session, rowId: string): boolean {
    const row = SessionEditing.rowOf(session, rowId);
    const next = SessionEditing.neighbour(session, rowId, 1);
    if (
      !row ||
      !next ||
      SINGLE_UNIT_SLOTS.includes(row.slot) ||
      next.slot !== row.slot
    ) {
      return false;
    }

    return (
      row.supersetGroup === undefined ||
      row.supersetGroup !== next.supersetGroup
    );
  }

  supersetWithNext(session: Session, rowId: string): Session {
    const row = SessionEditing.rowOf(session, rowId);
    const next = SessionEditing.neighbour(session, rowId, 1);
    if (!row || !next) return session;
    const group =
      row.supersetGroup ?? next.supersetGroup ?? this.options.newId();
    const joins = (other: ExerciseRow) =>
      other.id === row.id ||
      other.id === next.id ||
      (next.supersetGroup !== undefined &&
        other.supersetGroup === next.supersetGroup);

    return SessionEditing.withRows(
      session,
      session.rows.map((other) =>
        joins(other) ? SessionEditing.inGroup(other, group) : other,
      ),
    );
  }

  ungroup(session: Session, group: string): Session {
    return SessionEditing.withRows(
      session,
      session.rows.map((row) =>
        row.supersetGroup === group
          ? SessionEditing.inGroup(row, undefined)
          : row,
      ),
    );
  }

  replaceRow(session: Session, row: ExerciseRow): Session {
    return SessionEditing.withRowChanged(session, row.id, () => row);
  }

  remove(session: Session, rowId: string): Session {
    return SessionEditing.withRows(
      session,
      session.rows.filter((row) => row.id !== rowId),
    );
  }

  /** Clearing a session removes its exercise rows and keeps its warm-up and cool-down. */
  clear(session: Session): Session {
    return { ...session, rows: [] };
  }

  addSubstitution(
    session: Session,
    rowId: string,
    exerciseId: string,
  ): Session {
    return SessionEditing.withRowChanged(session, rowId, (row) => {
      if (
        row.exerciseId === exerciseId ||
        row.substitutions.includes(exerciseId)
      ) {
        return row;
      }

      return {
        ...row,
        substitutions: [...row.substitutions, exerciseId].slice(
          0,
          MAX_SUBSTITUTIONS,
        ),
      };
    });
  }

  removeSubstitution(
    session: Session,
    rowId: string,
    exerciseId: string,
  ): Session {
    return SessionEditing.withRowChanged(session, rowId, (row) => ({
      ...row,
      substitutions: row.substitutions.filter((id) => id !== exerciseId),
      touched: row.touched.includes("substitutions")
        ? row.touched
        : [...row.touched, "substitutions"],
    }));
  }

  suggestSubstitutions(session: Session, rowId: string): Session {
    return SessionEditing.withRowChanged(session, rowId, (row) => {
      const exercise = this.exerciseOf(row.exerciseId);

      return exercise
        ? { ...row, substitutions: this.substitutionsFor(exercise) }
        : row;
    });
  }

  private exerciseOf(exerciseId: string): LibraryExercise | undefined {
    return this.options.libraryExercises.find(
      (exercise) => exercise.id === exerciseId,
    );
  }

  private substitutionsFor(exercise: LibraryExercise): string[] {
    return Substitutions.suggestedFor(
      exercise,
      this.options.libraryExercises,
      this.options.equipment,
    );
  }

  private filledRow(
    exercise: LibraryExercise,
    { slot, supersetGroup }: RowPlacement,
  ): ExerciseRow {
    const { blockType, newId } = this.options;

    return {
      id: newId(),
      exerciseId: exercise.id,
      slot,
      ...(supersetGroup === undefined ? {} : { supersetGroup }),
      startSets: this.rowDefaults.defaultSets(blockType, slot),
      restSeconds: RowDefaults.forSlot(blockType, slot).restSeconds,
      lastSetTechnique: "none",
      substitutions: this.substitutionsFor(exercise),
      progression: { kind: "double" },
      cues: exercise.cues,
      touched: [],
    };
  }

  private static rowOf(
    session: Session,
    rowId: string,
  ): ExerciseRow | undefined {
    return session.rows.find((row) => row.id === rowId);
  }

  private static neighbour(
    session: Session,
    rowId: string,
    step: number,
  ): ExerciseRow | undefined {
    const index = session.rows.findIndex((row) => row.id === rowId);

    return index < 0 ? undefined : session.rows[index + step];
  }

  private static withRowChanged(
    session: Session,
    rowId: string,
    change: (row: ExerciseRow) => ExerciseRow,
  ): Session {
    return SessionEditing.withRows(
      session,
      session.rows.map((row) => (row.id === rowId ? change(row) : row)),
    );
  }

  private static withRows(session: Session, rows: ExerciseRow[]): Session {
    return {
      ...session,
      rows: SessionEditing.withoutLoneGroups(SessionEditing.inSlotOrder(rows)),
    };
  }

  private static nextSlot(slot: Slot): Slot {
    return SLOTS[Math.min(SLOTS.indexOf(slot) + 1, SLOTS.length - 1)];
  }

  /** A and B hold one unit each, so an exercise for a taken one goes to the next slot. */
  private static openSlot(rows: readonly ExerciseRow[], slot: Slot): Slot {
    let candidate = slot;
    while (
      SINGLE_UNIT_SLOTS.includes(candidate) &&
      rows.some((row) => row.slot === candidate)
    ) {
      candidate = SessionEditing.nextSlot(candidate);
    }

    return candidate;
  }

  private static inGroup(
    row: ExerciseRow,
    group: string | undefined,
  ): ExerciseRow {
    const { supersetGroup: _previous, ...rest } = row;

    return group === undefined ? rest : { ...rest, supersetGroup: group };
  }

  private static inSlotOrder(rows: readonly ExerciseRow[]): ExerciseRow[] {
    return SLOTS.flatMap((slot) => rows.filter((row) => row.slot === slot));
  }

  private static withoutLoneGroups(
    rows: readonly ExerciseRow[],
  ): ExerciseRow[] {
    return rows.map((row) => {
      if (row.supersetGroup === undefined) return row;
      const members = rows.filter(
        (other) =>
          other.slot === row.slot && other.supersetGroup === row.supersetGroup,
      );

      return members.length > 1 ? row : SessionEditing.inGroup(row, undefined);
    });
  }

  private static inserted(
    rows: readonly ExerciseRow[],
    { row, beforeRowId }: { row: ExerciseRow; beforeRowId?: string },
  ): ExerciseRow[] {
    const before = rows.findIndex((other) => other.id === beforeRowId);
    if (before >= 0) {
      return [...rows.slice(0, before), row, ...rows.slice(before)];
    }
    const lastOfSlot = rows.reduce(
      (last, other, at) =>
        SLOTS.indexOf(other.slot) <= SLOTS.indexOf(row.slot) ? at : last,
      -1,
    );

    return [
      ...rows.slice(0, lastOfSlot + 1),
      row,
      ...rows.slice(lastOfSlot + 1),
    ];
  }

  private static insertedAfter(
    rows: readonly ExerciseRow[],
    row: ExerciseRow,
    afterRowId: string,
  ): ExerciseRow[] {
    const after = rows.findIndex((other) => other.id === afterRowId);

    return [...rows.slice(0, after + 1), row, ...rows.slice(after + 1)];
  }

  private static unitsOf(rows: readonly ExerciseRow[]): SlotUnit[] {
    const units: SlotUnit[] = [];
    for (const row of rows) {
      const last = units.at(-1);
      const joinsLast =
        row.supersetGroup !== undefined &&
        last?.group === row.supersetGroup &&
        last.rows[0].slot === row.slot;
      if (joinsLast) last.rows.push(row);
      else units.push({ key: row.id, group: row.supersetGroup, rows: [row] });
    }

    return units;
  }
}
