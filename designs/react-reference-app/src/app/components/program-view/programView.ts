import { format, isSameMonth } from 'date-fns';
import type { Exercise } from '../../context/TrainingContext';
import {
  cardioOn,
  sessionOn,
  type Block,
  type CardioSession,
  type Program,
  type ProgramVersion,
  type Session,
  type Weekday,
} from '../../domain/program';
import { blockDates, currentPosition, planWeeks, type PlanPosition } from '../../domain/programCalendar';
import { cardioMinutes } from '../../domain/programCardio';
import { estimatedDuration, estimatedMinutes } from '../../domain/sessionTiming';
import { counted } from '../../utils/counted';
import { weekOfPlanText } from './weekView';

export type ProgramView = {
  program: Program;
  version: ProgramVersion;
  dayOne: Date | null;
  today: Date;
  preferredWeekday: Weekday;
  exercisesById: ReadonlyMap<string, Exercise>;
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

export function sessionSummary(session: Session, exercisesById: ReadonlyMap<string, Exercise>): string {
  const exercises = counted(session.rows.length, 'exercise');
  const minutes = estimatedMinutes(session, exercisesById);
  return minutes === 0 ? exercises : `${exercises} · ${estimatedDuration(minutes)}`;
}

export function cardioSummary(cardio: CardioSession): string {
  return cardio.segments.length > 0 ? `Cardio · ${cardioMinutes(cardio)} min` : 'Cardio · no segments';
}

export function musclesAndEquipmentText(exercise: Exercise | undefined): string {
  if (!exercise) return '';
  return [exercise.primaryMuscles.join(', '), exercise.equipment.join(', ')].filter(Boolean).join(' · ');
}

export function repsSuffix(exercise: Exercise | undefined): string {
  if (exercise?.measuredIn === 'time') return ' s';
  return exercise?.perSide ? ' /side' : '';
}

export function repsHeading(exercise: Exercise | undefined): string {
  const unit = exercise?.measuredIn === 'time' ? 'Seconds' : 'Reps';
  return exercise?.perSide ? `${unit} per side` : unit;
}

export function dateRangeText(first: Date, last: Date): string {
  if (isSameMonth(first, last)) return `${format(first, 'd')}–${format(last, 'd MMM')}`;
  return `${format(first, 'd MMM')}–${format(last, 'd MMM')}`;
}

export function plainText(markdown: string): string {
  return markdown.replaceAll('**', '');
}

export function exerciseNameOf(exercise: Exercise | undefined): string {
  return exercise?.name ?? 'Exercise removed';
}

export function exerciseName(exerciseId: string, exercisesById: ReadonlyMap<string, Exercise>): string {
  return exerciseNameOf(exercisesById.get(exerciseId));
}

export function hasCoolDown(session: Session): boolean {
  return session.coolDown.enabled && session.coolDown.items.length > 0;
}

const LONG_DATE = 'd MMMM';

function planEndDate(view: ProgramView): Date | null {
  const { blocks } = view.version.content.plan;
  return view.dayOne ? blockDates(blocks, blocks.length - 1, view.dayOne).end : null;
}

export function planStatusText(view: ProgramView): string | null {
  const end = planEndDate(view);
  if (view.position.status === 'ended' && end) return `Ended ${format(end, LONG_DATE)}`;
  if (view.position.status === 'before' && view.dayOne) return `Starts ${format(view.dayOne, LONG_DATE)}`;
  return null;
}

export function planReadingText(view: ProgramView): { value: string; detail: string | null } {
  const end = planEndDate(view);
  const value = view.position.status === 'in-plan' ? weekOfPlanText(view.position) : (planStatusText(view) ?? counted(planWeeks(view.version.content.plan.blocks), 'week'));
  return { value, detail: end && view.position.status !== 'ended' ? `ends ${format(end, LONG_DATE)}` : null };
}

export function dailyStepsText(block: Block): string {
  return block.dailySteps.toLocaleString('en-US');
}
