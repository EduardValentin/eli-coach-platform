import type { Exercise } from '../context/TrainingContext';
import { newId, SLOTS, withField, type Block, type Row, type Session, type Slot } from './program';
import { resetRowDefaults } from './programDefaults';
import { filledRow, type RowContext } from './programSuggestions';
import { slotPlanFor } from './splitTemplates';
import { MAX_SUBSTITUTIONS, substitutionsFor } from './substitutions';

export type Placement = { slot: Slot; beforeRowId?: string };
export type SlotUnit = { key: string; group?: string; rows: Row[] };

export const SINGLE_CARD_SLOTS: readonly Slot[] = ['A', 'B'];

function nextSlot(slot: Slot): Slot {
  return SLOTS[Math.min(SLOTS.indexOf(slot) + 1, SLOTS.length - 1)];
}

function openSlot(rows: Row[], slot: Slot): Slot {
  let candidate = slot;
  while (SINGLE_CARD_SLOTS.includes(candidate) && rows.some(row => row.slot === candidate)) candidate = nextSlot(candidate);
  return candidate;
}

function inGroup(row: Row, group: string | undefined): Row {
  if (group !== undefined) return { ...row, supersetGroup: group };
  return Object.fromEntries(Object.entries(row).filter(([key]) => key !== 'supersetGroup')) as Row;
}

function inSlotOrder(rows: Row[]): Row[] {
  return SLOTS.flatMap(slot => rows.filter(row => row.slot === slot));
}

function withoutLoneGroups(rows: Row[]): Row[] {
  return rows.map(row => {
    if (row.supersetGroup === undefined) return row;
    const members = rows.filter(other => other.slot === row.slot && other.supersetGroup === row.supersetGroup);
    return members.length > 1 ? row : inGroup(row, undefined);
  });
}

function tidy(rows: Row[]): Row[] {
  return withoutLoneGroups(inSlotOrder(rows));
}

function inserted(rows: Row[], row: Row, beforeRowId: string | undefined): Row[] {
  const before = rows.findIndex(other => other.id === beforeRowId);
  if (before >= 0) return [...rows.slice(0, before), row, ...rows.slice(before)];
  const lastOfSlot = rows.reduce((last, other, at) => (SLOTS.indexOf(other.slot) <= SLOTS.indexOf(row.slot) ? at : last), -1);
  return [...rows.slice(0, lastOfSlot + 1), row, ...rows.slice(lastOfSlot + 1)];
}

function insertedAfter(rows: Row[], row: Row, afterRowId: string): Row[] {
  const after = rows.findIndex(other => other.id === afterRowId);
  return [...rows.slice(0, after + 1), row, ...rows.slice(after + 1)];
}

function unitsOf(rows: readonly Row[]): SlotUnit[] {
  const units: SlotUnit[] = [];
  for (const row of rows) {
    const last = units.at(-1);
    const joinsLast = row.supersetGroup !== undefined && last?.group === row.supersetGroup && last.rows[0].slot === row.slot;
    if (joinsLast) last.rows.push(row);
    else units.push({ key: row.id, group: row.supersetGroup, rows: [row] });
  }
  return units;
}

export function slotUnits(session: Session, slot: Slot): SlotUnit[] {
  return unitsOf(session.rows.filter(row => row.slot === slot));
}

export function sessionUnits(session: Session): SlotUnit[] {
  return unitsOf(session.rows);
}

export function quickAddSlot(block: Block, session: Session, exercise: Exercise): Slot {
  const matching = SLOTS.find(slot => {
    const plan = slotPlanFor(block, session, slot);
    const fits = exercise.pattern !== undefined && plan?.patterns.includes(exercise.pattern);
    return fits && openSlot(session.rows, slot) === slot;
  });
  return matching ?? 'C';
}

export function rowEdits(session: Session, context: RowContext) {
  const { rows } = session;
  const withRows = (next: Row[]): Session => ({ ...session, rows: tidy(next) });
  const rowOf = (rowId: string) => rows.find(row => row.id === rowId);
  const reslotted = (row: Row, slot: Slot): Row => ({ ...row, slot });
  const mapRow = (rowId: string, change: (row: Row) => Row) => withRows(rows.map(row => (row.id === rowId ? change(row) : row)));

  function swap(rowId: string, otherId: string): Session {
    const row = rowOf(rowId);
    const other = rowOf(otherId);
    if (!row || !other || row === other) return session;
    const index = rows.indexOf(row);
    const otherIndex = rows.indexOf(other);
    const next = [...rows];
    next[index] = inGroup(reslotted(other, row.slot), row.supersetGroup);
    next[otherIndex] = inGroup(reslotted(row, other.slot), other.supersetGroup);
    return withRows(next);
  }

  function neighbour(rowId: string, step: number): Row | undefined {
    const index = rows.findIndex(row => row.id === rowId);
    return index < 0 ? undefined : rows[index + step];
  }

  function add(exercise: Exercise, placement: Placement): Session {
    const slot = openSlot(rows, placement.slot);
    const beforeRowId = slot === placement.slot ? placement.beforeRowId : undefined;
    return withRows(inserted(rows, filledRow(exercise, { slot }, context), beforeRowId));
  }

  return {
    session,
    add,
    move(rowId: string, placement: Placement): Session {
      const row = rowOf(rowId);
      if (!row || row.id === placement.beforeRowId) return session;
      const rest = rows.filter(other => other.id !== rowId);
      const slot = openSlot(rest, placement.slot);
      const moved = reslotted(inGroup(row, undefined), slot);
      return withRows(inserted(rest, moved, slot === placement.slot ? placement.beforeRowId : undefined));
    },
    addOnto(exercise: Exercise, targetRowId: string): Session {
      const target = rowOf(targetRowId);
      if (!target) return session;
      if (SINGLE_CARD_SLOTS.includes(target.slot)) return add(exercise, { slot: target.slot });
      const group = target.supersetGroup ?? newId();
      const grouped = rows.map(row => (row.id === targetRowId ? inGroup(row, group) : row));
      return withRows(insertedAfter(grouped, filledRow(exercise, { slot: target.slot, supersetGroup: group }, context), targetRowId));
    },
    supersetOnto(rowId: string, targetRowId: string): Session {
      const row = rowOf(rowId);
      const target = rowOf(targetRowId);
      if (!row || !target || row === target) return session;
      if (SINGLE_CARD_SLOTS.includes(target.slot)) return swap(rowId, targetRowId);
      const group = target.supersetGroup ?? newId();
      const rest = rows.filter(other => other.id !== rowId).map(other => (other.id === targetRowId ? inGroup(other, group) : other));
      return withRows(insertedAfter(rest, reslotted(inGroup(row, group), target.slot), targetRowId));
    },
    swap,
    moveUp(rowId: string): Session {
      const previous = neighbour(rowId, -1);
      return previous ? swap(rowId, previous.id) : session;
    },
    moveDown(rowId: string): Session {
      const next = neighbour(rowId, 1);
      return next ? swap(rowId, next.id) : session;
    },
    canSupersetWithNext(rowId: string): boolean {
      const row = rowOf(rowId);
      const next = neighbour(rowId, 1);
      if (!row || !next || SINGLE_CARD_SLOTS.includes(row.slot) || next.slot !== row.slot) return false;
      return row.supersetGroup === undefined || row.supersetGroup !== next.supersetGroup;
    },
    supersetWithNext(rowId: string): Session {
      const row = rowOf(rowId);
      const next = neighbour(rowId, 1);
      if (!row || !next) return session;
      const group = row.supersetGroup ?? next.supersetGroup ?? newId();
      const joins = (other: Row) =>
        other.id === row.id || other.id === next.id || (next.supersetGroup !== undefined && other.supersetGroup === next.supersetGroup);
      return withRows(rows.map(other => (joins(other) ? inGroup(other, group) : other)));
    },
    ungroup(group: string): Session {
      return withRows(rows.map(row => (row.supersetGroup === group ? inGroup(row, undefined) : row)));
    },
    replaceRow(row: Row): Session {
      return mapRow(row.id, () => row);
    },
    reset(rowId: string): Session {
      return mapRow(rowId, row => resetRowDefaults(row, context.blockType));
    },
    remove(rowId: string): Session {
      return withRows(rows.filter(row => row.id !== rowId));
    },
    clear(): Session {
      return { ...session, rows: [] };
    },
    addSubstitution(rowId: string, exerciseId: string): Session {
      return mapRow(rowId, row => {
        if (row.exerciseId === exerciseId || row.substitutions.includes(exerciseId)) return row;
        return { ...row, substitutions: [...row.substitutions, exerciseId].slice(0, MAX_SUBSTITUTIONS) };
      });
    },
    removeSubstitution(rowId: string, exerciseId: string): Session {
      return mapRow(rowId, row => withField(row, 'substitutions', row.substitutions.filter(id => id !== exerciseId)));
    },
    suggestSubstitutions(rowId: string): Session {
      return mapRow(rowId, row => {
        const exercise = context.library.find(item => item.id === row.exerciseId);
        return exercise ? { ...row, substitutions: substitutionsFor(exercise, context.library, context.equipment) } : row;
      });
    },
  };
}

export type RowEdits = ReturnType<typeof rowEdits>;
