import type { Exercise } from '../context/TrainingContext';
import type { Block, Session, Slot, Weekday } from './program';
import { WEEKDAYS } from './program';
import { copiedSessions, spreadCalendar } from './programSuggestions';
import { quickAddSlot, sessionEdits, type SessionEditContext } from './sessionEditing';

export type LibraryTarget =
  | { kind: 'slot'; sessionId: string; slot: Slot }
  | { kind: 'mobility'; sessionId: string }
  | { kind: 'substitution'; sessionId: string; rowId: string };

export type LibraryPick = { exercise: Exercise; target: LibraryTarget | null; openSessionId: string | undefined };

function pickedSession(block: Block, session: Session, pick: LibraryPick, context: SessionEditContext): Session {
  const edits = sessionEdits(session, context);
  const { exercise, target } = pick;
  if (target?.kind === 'substitution') return edits.addSubstitution(target.rowId, exercise.id);
  if (target?.kind === 'mobility' || exercise.type === 'mobility') return edits.addMobility(exercise.id);
  const slot = target?.kind === 'slot' ? target.slot : quickAddSlot(block, session, exercise);
  return edits.add(exercise, { slot });
}

export function blockWithLibraryPick(block: Block, pick: LibraryPick, context: SessionEditContext): Block {
  const sessionId = pick.target?.sessionId ?? pick.openSessionId;
  return {
    ...block,
    sessions: block.sessions.map(session => (session.id === sessionId ? pickedSession(block, session, pick, context) : session)),
  };
}

export function blockWithSession(block: Block, session: Session): Block {
  return { ...block, sessions: block.sessions.map(other => (other.id === session.id ? session : other)) };
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
