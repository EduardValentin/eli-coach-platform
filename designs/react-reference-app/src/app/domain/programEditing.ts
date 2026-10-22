import type { Exercise } from '../context/TrainingContext';
import type { Block, CardioSession, Session, Slot, Weekday } from './program';
import { WEEKDAYS } from './program';
import { cardioEdits } from './programCardio';
import { copiedSessions, spreadCalendar } from './programSuggestions';
import { quickAddSlot, sessionEdits, type SessionEditContext } from './sessionEditing';

export type LibraryTarget =
  | { kind: 'slot'; sessionId: string; slot: Slot }
  | { kind: 'warm-up'; sessionId: string }
  | { kind: 'cool-down'; sessionId: string }
  | { kind: 'substitution'; sessionId: string; rowId: string }
  | { kind: 'cardio-exercise'; sessionId: string; segmentId: string }
  | { kind: 'rounds-item'; sessionId: string; segmentId: string };

export type LibraryPick = { exercise: Exercise; target: LibraryTarget | null; openSessionId: string | undefined };

function pickedSession(block: Block, session: Session, pick: LibraryPick, context: SessionEditContext): Session {
  const edits = sessionEdits(session, context);
  const { exercise, target } = pick;
  if (target?.kind === 'substitution') return edits.addSubstitution(target.rowId, exercise.id);
  if (target?.kind === 'warm-up' || exercise.type === 'mobility') return edits.addWarmUpItem(exercise.id);
  if (target?.kind === 'cool-down' || exercise.type === 'stretching') return edits.addCoolDownItem(exercise.id);
  const slot = target?.kind === 'slot' ? target.slot : quickAddSlot(block, session, exercise);
  return edits.add(exercise, { slot });
}

function pickedCardio(cardio: CardioSession, pick: LibraryPick, library: SessionEditContext['library']): CardioSession {
  const edits = cardioEdits(cardio, library);
  const { exercise, target } = pick;
  if (target?.kind === 'cardio-exercise') return edits.replaceExercise(target.segmentId, exercise.id);
  if (target?.kind === 'rounds-item') return edits.addRoundsItem(target.segmentId, exercise.id);
  return exercise.type === 'cardio' ? edits.addSteady(exercise.id) : cardio;
}

export function blockWithLibraryPick(block: Block, pick: LibraryPick, context: SessionEditContext): Block {
  const sessionId = pick.target?.sessionId ?? pick.openSessionId;
  if (block.cardioSessions.some(cardio => cardio.id === sessionId)) {
    return {
      ...block,
      cardioSessions: block.cardioSessions.map(cardio => (cardio.id === sessionId ? pickedCardio(cardio, pick, context.library) : cardio)),
    };
  }
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
