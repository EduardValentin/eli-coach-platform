import { newId, WEEKDAYS, type Block, type CalendarEntry, type CardioSession, type Session, type Weekday } from './program';
import { CARDIO_INTENSITY_TEXT } from './programDefaults';

export type DayChoice = { kind: 'session'; sessionId: string } | { kind: 'cardio' } | { kind: 'rest' };

const NEW_CARDIO_MINUTES = 30;

function cardioOn(weekday: Weekday): CardioSession {
  return { id: newId(), type: 'liss', minutes: NEW_CARDIO_MINUTES, intensityText: CARDIO_INTENSITY_TEXT.liss, weekday, placement: 'separate' };
}

function entryFor(block: Block, day: Weekday, choice: DayChoice): { entry: CalendarEntry; added?: CardioSession } {
  if (choice.kind === 'session') return { entry: choice };
  if (choice.kind === 'rest') return { entry: { kind: 'rest' } };
  const current = block.calendar[day];
  if (current.kind === 'cardio') return { entry: current };
  const added = cardioOn(day);
  return { entry: { kind: 'cardio', cardioId: added.id }, added };
}

export function blockWithDay(block: Block, day: Weekday, choice: DayChoice): Block {
  const { entry, added } = entryFor(block, day, choice);
  const previous = block.calendar[day];
  const calendar = Object.fromEntries(
    WEEKDAYS.map(other => {
      if (other === day) return [other, entry];
      const current = block.calendar[other];
      const leftBehind = choice.kind === 'session' && current.kind === 'session' && current.sessionId === choice.sessionId;
      return [other, leftBehind ? { kind: 'rest' } : current];
    }),
  ) as Block['calendar'];
  const dropped = previous.kind === 'cardio' && entry.kind !== 'cardio' ? previous.cardioId : undefined;
  const cardioSessions = [...block.cardioSessions.filter(cardio => cardio.id !== dropped), ...(added ? [added] : [])];
  return { ...block, calendar, cardioSessions };
}

export function blockWithCardio(block: Block, cardio: CardioSession): Block {
  const cardioSessions = block.cardioSessions.map(other => {
    if (other.id !== cardio.id) return other;
    return other.type === cardio.type ? cardio : { ...cardio, intensityText: CARDIO_INTENSITY_TEXT[cardio.type] };
  });
  return { ...block, cardioSessions };
}

export function sessionsInCalendarOrder(block: Block): Session[] {
  const dayOf = (session: Session) =>
    WEEKDAYS.findIndex(day => {
      const entry = block.calendar[day];
      return entry.kind === 'session' && entry.sessionId === session.id;
    });
  const rank = (session: Session) => (dayOf(session) < 0 ? WEEKDAYS.length : dayOf(session));
  return [...block.sessions].sort((left, right) => rank(left) - rank(right));
}
