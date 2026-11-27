import type { Exercise } from '../context/TrainingContext';
import { mapCalendar, type Block, type BlockType, type CardioSession, type Session, type Slot } from './program';
import { cardioEdits } from './programCardio';
import { coolDownEdits, type CoolDownRefusal } from './coolDownEditing';
import { blockSwitchedToDeload, reDefaultedBlock, type DeloadSwitch } from './programDefaults';
import { sessionsCopiedFromFirstWeek } from './programProgression';
import { spreadCalendar, type RowContext } from './programSuggestions';
import { quickAddSlot, rowEdits, type SubstitutionRefusal } from './sessionEditing';
import { warmUpEdits, type WarmUpRefusal } from './warmUpEditing';

export type LibraryTarget =
  | { kind: 'slot'; sessionId: string; slot: Slot }
  | { kind: 'warm-up'; sessionId: string }
  | { kind: 'cool-down'; sessionId: string }
  | { kind: 'substitution'; sessionId: string; rowId: string }
  | { kind: 'cardio-exercise'; sessionId: string; segmentId: string }
  | { kind: 'rounds-item'; sessionId: string; segmentId: string };

export type LibraryPick = { exercise: Exercise; target: LibraryTarget | null; openSessionId: string | undefined };

export type LibraryPickRefusal = WarmUpRefusal | CoolDownRefusal | SubstitutionRefusal | 'not-cardio';

type PickedPlace = { block: Block; session: Session };

type PickDestination = { place: 'substitution'; rowId: string } | { place: 'warm-up' } | { place: 'cool-down' } | { place: 'slot' };

function destinationOf({ exercise, target }: LibraryPick): PickDestination {
  if (target?.kind === 'substitution') return { place: 'substitution', rowId: target.rowId };
  if (target?.kind === 'warm-up' || exercise.type === 'mobility') return { place: 'warm-up' };
  if (target?.kind === 'cool-down' || exercise.type === 'stretching') return { place: 'cool-down' };
  return { place: 'slot' };
}

function pickedSession({ block, session }: PickedPlace, pick: LibraryPick, context: RowContext): Session {
  const { exercise, target } = pick;
  const destination = destinationOf(pick);
  if (destination.place === 'substitution') return rowEdits(session, context).addSubstitution(destination.rowId, exercise.id);
  if (destination.place === 'warm-up') return warmUpEdits(session, context.library).add(exercise.id);
  if (destination.place === 'cool-down') return coolDownEdits(session).add(exercise.id);
  const slot = target?.kind === 'slot' ? target.slot : quickAddSlot(block, session, exercise);
  return rowEdits(session, context).add(exercise, { slot });
}

function sessionRefusal(session: Session, pick: LibraryPick, context: RowContext): LibraryPickRefusal | undefined {
  const destination = destinationOf(pick);
  if (destination.place === 'substitution') return rowEdits(session, context).substitutionRefusalFor(destination.rowId, pick.exercise.id);
  if (destination.place === 'warm-up') return warmUpEdits(session, context.library).refusalFor(pick.exercise.id);
  if (destination.place === 'cool-down') return coolDownEdits(session).refusalFor(pick.exercise.id);
  return undefined;
}

function pickedCardio(cardio: CardioSession, pick: LibraryPick, library: readonly Exercise[]): CardioSession {
  const edits = cardioEdits(cardio, library);
  const { exercise, target } = pick;
  if (target?.kind === 'cardio-exercise') return edits.replaceExercise(target.segmentId, exercise.id);
  if (target?.kind === 'rounds-item') return edits.addRoundsItem(target.segmentId, exercise.id);
  return exercise.type === 'cardio' ? edits.addSteady(exercise.id) : cardio;
}

export function blockWithLibraryPick(block: Block, pick: LibraryPick, context: RowContext): Block {
  const sessionId = pick.target?.sessionId ?? pick.openSessionId;
  if (block.cardioSessions.some(cardio => cardio.id === sessionId)) {
    return {
      ...block,
      cardioSessions: block.cardioSessions.map(cardio => (cardio.id === sessionId ? pickedCardio(cardio, pick, context.library) : cardio)),
    };
  }
  return {
    ...block,
    sessions: block.sessions.map(session => (session.id === sessionId ? pickedSession({ block, session }, pick, context) : session)),
  };
}

export function libraryPickRefusal(block: Block, pick: LibraryPick, context: RowContext): LibraryPickRefusal | undefined {
  const sessionId = pick.target?.sessionId ?? pick.openSessionId;
  if (block.cardioSessions.some(cardio => cardio.id === sessionId)) {
    return pick.target === null && pick.exercise.type !== 'cardio' ? 'not-cardio' : undefined;
  }
  const session = block.sessions.find(other => other.id === sessionId);
  return session && sessionRefusal(session, pick, context);
}

export function blockWithSession(block: Block, session: Session): Block {
  return { ...block, sessions: block.sessions.map(other => (other.id === session.id ? session : other)) };
}

export function blockWithType(block: Block, type: BlockType, deload: DeloadSwitch): Block {
  return type === 'deload' ? blockSwitchedToDeload(block, deload) : reDefaultedBlock(block, type);
}

function calendarByPosition(block: Block, sessions: Session[]): Block['calendar'] {
  const newIdAt = new Map(block.sessions.map((session, index) => [session.id, sessions[index]?.id]));
  return mapCalendar(day => {
    const entry = block.calendar[day];
    if (entry.kind !== 'session') return entry;
    const sessionId = newIdAt.get(entry.sessionId);
    return sessionId ? { kind: 'session', sessionId } : { kind: 'rest' };
  });
}

export function blockWithSessionsFrom(block: Block, source: Session[]): Block {
  const sessions = sessionsCopiedFromFirstWeek(source);
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
