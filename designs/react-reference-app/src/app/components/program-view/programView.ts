import { addDays, startOfDay, startOfWeek } from 'date-fns';
import type { Exercise } from '../../context/TrainingContext';
import {
  WEEKDAYS,
  type Block,
  type CalendarEntry,
  type CardioSegment,
  type CardioSession,
  type Program,
  type ProgramVersion,
  type Session,
  type Weekday,
} from '../../domain/program';
import { currentPosition, type PlanPosition } from '../../domain/programCalendar';
import { CARDIO_INTENSITY_TEXT } from '../../domain/programCardio';

const SECONDS_PER_MINUTE = 60;

export type ProgramView = {
  program: Program;
  version: ProgramVersion;
  dayOne: Date | null;
  today: Date;
  preferredWeekday: Weekday;
  exercisesById: ReadonlyMap<string, Exercise>;
  cycleDay: number | null;
  position: PlanPosition;
  clientName: string;
};

type ViewInput = Omit<ProgramView, 'exercisesById' | 'position' | 'clientName'> & {
  exercises: readonly Exercise[];
  clientName?: string;
};

export function viewOf({ exercises, ...input }: ViewInput): ProgramView {
  return {
    ...input,
    clientName: input.clientName ?? '',
    exercisesById: new Map(exercises.map(exercise => [exercise.id, exercise])),
    position: currentPosition(input.version.content.plan.blocks, input.dayOne, input.today),
  };
}

export function currentBlock(view: ProgramView): Block | null {
  const { blocks } = view.version.content.plan;
  if (view.position.status === 'in-plan') return blocks[view.position.blockIndex];
  return (view.position.status === 'ended' ? blocks.at(-1) : blocks[0]) ?? null;
}

export function dayEntries(block: Block, weekday: Weekday): CalendarEntry {
  return block.calendar[weekday];
}

export function sessionFor(block: Block, weekday: Weekday): Session | null {
  const entry = dayEntries(block, weekday);
  if (entry.kind !== 'session') return null;
  return block.sessions.find(session => session.id === entry.sessionId) ?? null;
}

export function cardioFor(block: Block, weekday: Weekday): CardioSession | null {
  const entry = dayEntries(block, weekday);
  if (entry.kind !== 'cardio') return null;
  return block.cardioSessions.find(cardio => cardio.id === entry.cardioId) ?? null;
}

export function sessionAnchor(sessionId: string): string {
  return `program-session-${sessionId}`;
}

export function weekStart(view: ProgramView): Date {
  return startOfWeek(startOfDay(view.today), { weekStartsOn: 1 });
}

export function weekDates(view: ProgramView): Record<Weekday, Date> {
  const start = weekStart(view);
  return Object.fromEntries(WEEKDAYS.map((day, index) => [day, addDays(start, index)])) as Record<Weekday, Date>;
}

export function restLabel(seconds: number): string {
  if (seconds % SECONDS_PER_MINUTE === 0) return `${seconds / SECONDS_PER_MINUTE} min`;
  return `${seconds} s`;
}

export function plainText(markdown: string): string {
  return markdown.replaceAll('**', '');
}

export function cardioDayLabel(block: Block, weekday: Weekday): string {
  return cardioFor(block, weekday)?.name ?? 'Cardio';
}

export function cardioSegmentText({ exerciseId, plan }: CardioSegment, exercisesById: ReadonlyMap<string, Exercise>): string {
  const nameOf = (id: string) => exercisesById.get(id)?.name ?? 'Exercise removed';
  if (plan.kind === 'steady') return `${nameOf(exerciseId)} · ${plan.minutes} min · ${CARDIO_INTENSITY_TEXT[plan.intensity]}`;
  if (plan.kind === 'intervals') {
    const rounds = `${plan.rounds} × ${plan.workSeconds} s on, ${plan.easySeconds} s easy`;
    return `${nameOf(exerciseId)} · ${rounds} · ${CARDIO_INTENSITY_TEXT[plan.intensity]}`;
  }
  const items = plan.items.map(item => `${nameOf(item.exerciseId)} ${item.seconds === undefined ? `${item.reps ?? 0} reps` : `${item.seconds} s`}`);
  return `${plan.rounds} rounds of ${items.join(', ')} · ${plan.restSeconds} s rest between rounds`;
}
