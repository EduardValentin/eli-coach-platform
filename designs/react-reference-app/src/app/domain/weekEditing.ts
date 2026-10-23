import {
  cardioOn,
  mapCalendar,
  sessionOn,
  WEEKDAYS,
  type Block,
  type CalendarEntry,
  type CardioSession,
  type ProgramLanguage,
  type Session,
  type SplitShape,
  type TrainingDays,
  type Weekday,
} from './program';
import { emptySessionsFor, splitFor, spreadCalendar } from './programSuggestions';

export type PlannedSession = { kind: 'strength'; session: Session } | { kind: 'cardio'; cardio: CardioSession };
export type ScheduledItem = PlannedSession & { days: Weekday[] };

export type DayChoice = { kind: 'session'; sessionId: string } | { kind: 'cardio'; session: CardioSession } | { kind: 'rest' };

function entryFor(block: Block, day: Weekday, choice: DayChoice): { entry: CalendarEntry; added?: CardioSession } {
  if (choice.kind === 'session') return { entry: choice };
  if (choice.kind === 'rest') return { entry: { kind: 'rest' } };
  const current = block.calendar[day];
  if (current.kind === 'cardio') return { entry: current };
  return { entry: { kind: 'cardio', cardioId: choice.session.id }, added: choice.session };
}

function sessionLeaving(previous: CalendarEntry, choice: DayChoice): string | undefined {
  if (previous.kind !== 'session' || choice.kind === 'session') return undefined;
  return previous.sessionId;
}

export function blockWithDay(block: Block, day: Weekday, choice: DayChoice): Block {
  const { entry, added } = entryFor(block, day, choice);
  const previous = block.calendar[day];
  const removedSession = sessionLeaving(previous, choice);
  const calendar = mapCalendar(other => {
    if (other === day) return entry;
    const current = block.calendar[other];
    const leftBehind = choice.kind === 'session' && current.kind === 'session' && current.sessionId === choice.sessionId;
    const removed = current.kind === 'session' && current.sessionId === removedSession;
    return leftBehind || removed ? { kind: 'rest' } : current;
  });
  const dropped = previous.kind === 'cardio' && entry.kind !== 'cardio' ? previous.cardioId : undefined;
  const cardioSessions = [...block.cardioSessions.filter(cardio => cardio.id !== dropped), ...(added ? [added] : [])];
  const sessions = block.sessions.filter(session => session.id !== removedSession);
  return { ...block, calendar, sessions, cardioSessions };
}

export function blockWithCardio(block: Block, cardio: CardioSession): Block {
  return { ...block, cardioSessions: block.cardioSessions.map(other => (other.id === cardio.id ? cardio : other)) };
}

export function blockWithSplit(block: Block, shape: SplitShape, language: ProgramLanguage): Block {
  const sessions = emptySessionsFor(shape, block.trainingDays);
  return {
    ...block,
    split: { ...block.split, ...splitFor(shape, block.trainingDays, language) },
    sessions,
    calendar: spreadCalendar(
      shape,
      sessions.map(session => session.id),
      block.cardioSessions,
    ),
  };
}

export function plannedId(entry: PlannedSession): string {
  return entry.kind === 'cardio' ? entry.cardio.id : entry.session.id;
}

function plannedOn(block: Block, day: Weekday): PlannedSession | undefined {
  const session = sessionOn(block, day);
  if (session) return { kind: 'strength', session };
  const cardio = cardioOn(block, day);
  return cardio ? { kind: 'cardio', cardio } : undefined;
}

export function scheduledItems(block: Block): ScheduledItem[] {
  const byId = new Map<string, ScheduledItem>();
  for (const day of WEEKDAYS) {
    const planned = plannedOn(block, day);
    if (!planned) continue;
    const item = byId.get(plannedId(planned)) ?? { ...planned, days: [] };
    item.days.push(day);
    byId.set(plannedId(planned), item);
  }
  return [...byId.values()];
}

export function plannedSessions(block: Block): PlannedSession[] {
  const onCalendar = scheduledItems(block);
  const placed = new Set(onCalendar.map(plannedId));
  const unplaced = block.sessions.filter(session => !placed.has(session.id)).map((session): PlannedSession => ({ kind: 'strength', session }));
  return [...onCalendar, ...unplaced];
}

export type ResetChange =
  | { kind: 'split' }
  | { kind: 'reset' }
  | { kind: 'training-days'; days: TrainingDays }
  | { kind: 'day'; weekday: Weekday }
  | { kind: 'clear-session'; sessionId: string }
  | { kind: 'remove-block' };

function placedCardio(block: Block, days: TrainingDays): CardioSession[] {
  const freeDays = WEEKDAYS.length - days;
  return block.cardioSessions.slice(0, freeDays);
}

export function relayoutBlock(block: Block, days: TrainingDays): Block {
  const kept = block.sessions.slice(0, days);
  const added = emptySessionsFor(block.split.shape, days).slice(kept.length);
  const sessions = [...kept, ...added];
  const cardioSessions = placedCardio(block, days);
  const calendar = spreadCalendar(
    block.split.shape,
    sessions.map(session => session.id),
    cardioSessions,
  );
  return { ...block, trainingDays: days, sessions, cardioSessions, calendar };
}

function counted(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

function sessionLoss(session: Session): string[] {
  const exercises = session.rows.filter(row => row.exerciseId !== '').length;
  return exercises > 0 ? [`${session.name} · ${counted(exercises, 'exercise')}`] : [];
}

function cardioLoss(cardio: CardioSession): string[] {
  return cardio.segments.length > 0 ? [`${cardio.name} · ${counted(cardio.segments.length, 'segment')}`] : [];
}

function lostOnDay(block: Block, weekday: Weekday): string[] {
  const planned = plannedOn(block, weekday);
  if (!planned) return [];
  return planned.kind === 'strength' ? sessionLoss(planned.session) : cardioLoss(planned.cardio);
}

function lostSessions(block: Block, change: Exclude<ResetChange, { kind: 'day' }>): string[] {
  if (change.kind === 'training-days') {
    const placed = new Set(placedCardio(block, change.days));
    return [
      ...block.sessions.slice(change.days).flatMap(sessionLoss),
      ...block.cardioSessions.filter(cardio => !placed.has(cardio)).flatMap(cardioLoss),
    ];
  }
  if (change.kind === 'clear-session') {
    return [
      ...block.sessions.filter(session => session.id === change.sessionId).flatMap(sessionLoss),
      ...block.cardioSessions.filter(cardio => cardio.id === change.sessionId).flatMap(cardioLoss),
    ];
  }
  if (change.kind === 'remove-block') return [...block.sessions.flatMap(sessionLoss), ...block.cardioSessions.flatMap(cardioLoss)];
  return block.sessions.flatMap(sessionLoss);
}

export function describeLoss(block: Block, change: ResetChange): string[] {
  if (change.kind === 'day') return lostOnDay(block, change.weekday);
  return lostSessions(block, change);
}
