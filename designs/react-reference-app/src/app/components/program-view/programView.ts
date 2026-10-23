import { addDays, startOfDay, startOfWeek } from 'date-fns';
import type { Exercise } from '../../context/TrainingContext';
import {
  cardioOn,
  sessionOn,
  WEEKDAYS,
  warmUpItemText,
  type Block,
  type CardioSegment,
  type Program,
  type ProgramVersion,
  type Session,
  type Weekday,
} from '../../domain/program';
import { currentPosition, type PlanPosition } from '../../domain/programCalendar';
import { CARDIO_INTENSITY_TEXT, roundsText } from '../../domain/programCardio';

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

export function dayEntryLabel(block: Block, weekday: Weekday): string {
  const kind = block.calendar[weekday].kind;
  if (kind === 'session') return sessionOn(block, weekday)?.name ?? 'Session';
  if (kind === 'cardio') return cardioOn(block, weekday)?.name ?? 'Cardio';
  return 'Rest';
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

export function exerciseName(exerciseId: string, exercisesById: ReadonlyMap<string, Exercise>): string {
  return exercisesById.get(exerciseId)?.name ?? 'Exercise removed';
}

export function cardioSegmentText(segment: CardioSegment, exercisesById: ReadonlyMap<string, Exercise>): string {
  const nameOf = (id: string) => exerciseName(id, exercisesById);
  if (segment.kind === 'rounds') return roundsText(segment, nameOf);
  return `${nameOf(segment.exerciseId)} · ${segment.minutes} min · ${CARDIO_INTENSITY_TEXT[segment.intensity]}`;
}

export function warmUpLines(session: Session, exercisesById: ReadonlyMap<string, Exercise>): string[] {
  return session.warmUp.items.map(item => `${exerciseName(item.exerciseId, exercisesById)} · ${warmUpItemText(item)}`);
}

export function coolDownLines(session: Session, exercisesById: ReadonlyMap<string, Exercise>): string[] {
  return session.coolDown.items.map(item => `${exerciseName(item.exerciseId, exercisesById)} · ${item.seconds} s`);
}
