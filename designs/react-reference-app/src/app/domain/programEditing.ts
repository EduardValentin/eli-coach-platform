import type { Exercise } from '../context/TrainingContext';
import type { Equipment } from './exercises';
import type { Block, Row, Session, Weekday } from './program';
import { WEEKDAYS } from './program';
import { defaultedRow } from './programDefaults';
import { copiedSessions, spreadCalendar, substitutionsFor } from './programSuggestions';

export type RowTarget = {
  sessionId: string;
  rowId: string;
  field: 'exercise' | 'substitution' | 'mobility';
  index?: number;
};

const MAX_MOBILITY_EXERCISES = 4;

function filledRow(row: Row, exercise: Exercise, blockType: Block['type'], library: readonly Exercise[], equipment: readonly Equipment[]): Row {
  const defaulted = defaultedRow({ ...row, exerciseId: exercise.id }, blockType);
  return {
    ...defaulted,
    substitutions: row.substitutions.length > 0 ? row.substitutions : substitutionsFor(exercise, library, equipment),
    cues: row.touched.includes('cues') ? row.cues : exercise.cues,
  };
}

function withSubstitution(row: Row, exerciseId: string, index: number | undefined): Row {
  const substitutions = [...row.substitutions];
  if (index !== undefined && index < substitutions.length) substitutions[index] = exerciseId;
  else substitutions.push(exerciseId);
  return { ...row, substitutions };
}

function withMobility(session: Session, exerciseId: string): Session {
  const { mobilityExerciseIds } = session.warmUp;
  if (mobilityExerciseIds.includes(exerciseId) || mobilityExerciseIds.length >= MAX_MOBILITY_EXERCISES) return session;
  return { ...session, warmUp: { ...session.warmUp, mobilityExerciseIds: [...mobilityExerciseIds, exerciseId] } };
}

export function blockWithPick(
  block: Block,
  target: RowTarget,
  exercise: Exercise,
  library: readonly Exercise[],
  equipment: readonly Equipment[],
): Block {
  const sessions = block.sessions.map(session => {
    if (session.id !== target.sessionId) return session;
    if (target.field === 'mobility') return withMobility(session, exercise.id);
    const rows = session.rows.map(row => {
      if (row.id !== target.rowId) return row;
      if (target.field === 'substitution') return withSubstitution(row, exercise.id, target.index);
      return filledRow(row, exercise, block.type, library, equipment);
    });
    return { ...session, rows };
  });
  return { ...block, sessions };
}

function calendarByPosition(block: Block, sessions: Session[]): Block['calendar'] {
  const newIdAt = new Map(block.sessions.map((session, index) => [session.id, sessions[index]?.id]));
  const entries = WEEKDAYS.map((day): [Weekday, Block['calendar'][Weekday]] => {
    const entry = block.calendar[day];
    if (entry.kind !== 'session') return [day, entry];
    const sessionId = newIdAt.get(entry.sessionId);
    return [day, sessionId ? { kind: 'session', sessionId } : { kind: 'rest' }];
  });
  return Object.fromEntries(entries) as Block['calendar'];
}

export function blockWithSessionsFrom(block: Block, source: Session[]): Block {
  const sessions = copiedSessions(source);
  const calendar =
    sessions.length === block.sessions.length
      ? calendarByPosition(block, sessions)
      : spreadCalendar(
          block.split.shape,
          sessions.map(session => session.id),
          block.cardioSessions,
        );
  return { ...block, sessions, calendar };
}
