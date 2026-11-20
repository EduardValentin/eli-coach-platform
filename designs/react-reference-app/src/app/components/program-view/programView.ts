import { format, isSameMonth } from 'date-fns';
import type { Exercise } from '../../context/TrainingContext';
import type { Block, CardioSession, Program, ProgramVersion, Session, Weekday } from '../../domain/program';
import { blockDates, currentPosition, planWeeks, type DateRange, type PlanPosition } from '../../domain/programCalendar';
import { cardioMinutes } from '../../domain/programCardio';
import { programText, type ProgramText, type ProgramTextTarget } from '../../domain/programTexts';
import { estimatedDuration } from '../../domain/sessionTiming';
import { counted } from '../../utils/counted';
import { weekOfPlanText } from './weekView';

export type ExerciseLibrary = ReadonlyMap<string, Exercise>;

export type ProgramView = {
  program: Program;
  version: ProgramVersion;
  dayOne: Date | null;
  today: Date;
  preferredWeekday: Weekday;
  exercisesById: ExerciseLibrary;
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

export function blocksOf(view: ProgramView): readonly Block[] {
  return view.version.content.plan.blocks;
}

export function viewText(view: ProgramView, target: ProgramTextTarget): ProgramText {
  return programText(view.version, target, view.program.language);
}

export function currentBlock(view: ProgramView): Block | null {
  const blocks = blocksOf(view);
  if (view.position.status === 'in-plan') return blocks[view.position.blockIndex];
  return (view.position.status === 'ended' ? blocks.at(-1) : blocks[0]) ?? null;
}

export function sessionSummary(session: Session, minutes: number): string {
  const exercises = counted(session.rows.length, 'exercise');
  return minutes === 0 ? exercises : `${exercises} · ${estimatedDuration(minutes)}`;
}

export function cardioSummary(cardio: CardioSession): string {
  return cardio.segments.length > 0 ? `Cardio · ${cardioMinutes(cardio)} min` : 'Cardio · no segments';
}

export function musclesAndEquipmentText(exercise: Exercise | undefined): string {
  if (!exercise) return '';
  return [exercise.primaryMuscles.join(', '), exercise.equipment.join(', ')].filter(Boolean).join(' · ');
}

export function perSideUnit(exercise: Exercise | undefined, unit: string): string {
  return [unit, exercise?.perSide ? 'per side' : ''].filter(Boolean).join(' ');
}

/** How the reps unit reads: `implied` after a number where reps go without saying, `spelled` after a number, `column` as a column name. */
type RepsWording = 'implied' | 'spelled' | 'column';

const REPS_WORDS: Record<RepsWording, { reps: string; time: string }> = {
  implied: { reps: '', time: 's' },
  spelled: { reps: 'reps', time: 's' },
  column: { reps: 'Reps', time: 'Seconds' },
};

export function repsUnit(exercise: Exercise | undefined, wording: RepsWording = 'implied'): string {
  const words = REPS_WORDS[wording];
  return perSideUnit(exercise, exercise?.measuredIn === 'time' ? words.time : words.reps);
}

export function repsSuffix(exercise: Exercise | undefined): string {
  const unit = repsUnit(exercise);
  return unit && ` ${unit}`;
}

const SHORTEST_WEEK_RANGE = 3;

/** Week numbers with a run of three or more neighbouring weeks as a range, "2, 3, 5–8", since a range of two saves nothing. */
export function weekRunsText(weeks: readonly number[]): string {
  const runs = weeks.reduce<number[][]>((found, week) => {
    const last = found.at(-1);
    if (last && last.at(-1) === week - 1) return [...found.slice(0, -1), [...last, week]];
    return [...found, [week]];
  }, []);
  return runs.flatMap(run => (run.length >= SHORTEST_WEEK_RANGE ? [`${run[0]}–${run.at(-1)}`] : run.map(String))).join(', ');
}

export const WHAT_CHANGED_LEAD = 'What changed:';

const NO_BREAK = '\u00a0';
const LONG_DAY_MONTH = `d'${NO_BREAK}'MMMM`;

export function dateRangeText({ start, end }: DateRange): string {
  if (isSameMonth(start, end)) return `${format(start, 'd')}–${format(end, 'd MMM')}`;
  return `${format(start, 'd MMM')}–${format(end, 'd MMM')}`;
}

/** Breaks, if at all, only after the dash, so no line starts with "–". */
export function longRangeText({ start, end }: DateRange): string {
  if (isSameMonth(start, end)) return `${format(start, 'd')}–${format(end, LONG_DAY_MONTH)}`;
  return `${format(start, LONG_DAY_MONTH)}${NO_BREAK}– ${format(end, LONG_DAY_MONTH)}`;
}

export function spokenRangeText({ start, end }: DateRange): string {
  return `${format(start, 'd MMM')} to ${format(end, 'd MMM')}`;
}

export function plainText(markdown: string): string {
  return markdown.replaceAll('**', '');
}

export function exerciseNameOf(exercise: Exercise | undefined): string {
  return exercise?.name ?? 'Exercise removed';
}

export function exerciseName(exerciseId: string, exercisesById: ExerciseLibrary): string {
  return exerciseNameOf(exercisesById.get(exerciseId));
}

const LONG_DATE = 'd MMMM';

function planEndDate(view: ProgramView): Date | null {
  const blocks = blocksOf(view);
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
  const value = view.position.status === 'in-plan' ? weekOfPlanText(view.position) : (planStatusText(view) ?? counted(planWeeks(blocksOf(view)), 'week'));
  return { value, detail: end && view.position.status !== 'ended' ? `ends ${format(end, LONG_DATE)}` : null };
}

export function dailyStepsText(block: Block): string {
  return block.dailySteps.toLocaleString('en-US');
}
