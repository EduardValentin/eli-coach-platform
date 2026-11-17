import { isSameDay } from 'date-fns';
import type { Exercise } from '../../context/TrainingContext';
import { BLOCK_TYPE_LABELS, cardioOn, isBlockWritten, sessionOn, type Block, type CardioSession, type Session, type Weekday } from '../../domain/program';
import { blockDates, planWeek, planWeeks, shownWeekOfPlan } from '../../domain/programCalendar';
import { cardioMinutes } from '../../domain/programCardio';
import { estimatedDuration, estimatedMinutes } from '../../domain/sessionTiming';
import type { PlacedTexts } from './programTextPlacement';
import type { ProgramView } from './programView';

export type DayPlan = { kind: 'session'; session: Session } | { kind: 'cardio'; cardio: CardioSession } | { kind: 'rest' };

export type WeekDay = { weekday: Weekday; date: Date | null; checkIn: boolean; isToday: boolean; plan: DayPlan };

export type DayContext = { view: ProgramView; week: WeekView; texts: PlacedTexts };

export type WeekView = {
  weekOfPlan: number;
  totalWeeks: number;
  block: Block;
  blockIndex: number;
  weekOfBlock: number;
  blockStart: Date | null;
  calibration: boolean;
  isWritten: boolean;
  days: WeekDay[];
};

export function planOn(block: Block, weekday: Weekday): DayPlan {
  const session = sessionOn(block, weekday);
  if (session) return { kind: 'session', session };
  const cardio = cardioOn(block, weekday);
  return cardio ? { kind: 'cardio', cardio } : { kind: 'rest' };
}

export function currentWeekOfPlan(view: ProgramView): number {
  return shownWeekOfPlan(view.version.content.plan.blocks, view.position);
}

export function clampedWeekOfPlan(view: ProgramView, requested: number | null): number {
  const total = planWeeks(view.version.content.plan.blocks);
  if (requested === null || !Number.isInteger(requested)) return currentWeekOfPlan(view);
  return Math.min(Math.max(requested, 1), total);
}

export function weekViewAt(view: ProgramView, weekOfPlan: number): WeekView {
  const { blocks } = view.version.content.plan;
  const { dayOne, today, position } = view;
  const week = planWeek({ blocks, dayOne }, weekOfPlan, view.preferredWeekday);
  const block = blocks[week.blockIndex];
  const inPlan = position.status === 'in-plan';
  return {
    weekOfPlan,
    totalWeeks: planWeeks(blocks),
    block,
    blockIndex: week.blockIndex,
    weekOfBlock: week.weekOfBlock,
    blockStart: dayOne ? blockDates(blocks, week.blockIndex, dayOne).start : null,
    calibration: week.calibration,
    isWritten: isBlockWritten(block),
    days: week.days.map(day => ({
      ...day,
      isToday: inPlan && day.date !== null && isSameDay(day.date, today),
      plan: planOn(block, day.weekday),
    })),
  };
}

export function defaultWeekday(week: WeekView): Weekday {
  const today = week.days.find(day => day.isToday);
  const firstTraining = week.days.find(day => day.plan.kind !== 'rest');
  return (today ?? firstTraining ?? week.days[0]).weekday;
}

export function nextTrainingDay(week: WeekView, after: WeekDay): WeekDay | undefined {
  return week.days.slice(week.days.indexOf(after) + 1).find(day => day.plan.kind !== 'rest');
}

export function dayPlanName(plan: DayPlan): string {
  if (plan.kind === 'session') return plan.session.name;
  return plan.kind === 'cardio' ? plan.cardio.name : 'Rest';
}

export function dayAnchor(weekday: Weekday): string {
  return `program-day-${weekday}`;
}

type WeekOfPlan = { weekOfPlan: number; totalWeeks: number };
type WeekOfBlock = { block: Pick<Block, 'type' | 'weeks'>; weekOfBlock: number };

export function weekOfPlanText(week: WeekOfPlan): string {
  return `Week ${week.weekOfPlan} of ${week.totalWeeks}`;
}

function weekOfBlockPart(week: WeekOfBlock): string {
  return `week ${week.weekOfBlock} of ${week.block.weeks}`;
}

export function weekOfBlockText(week: WeekOfBlock): string {
  return `${BLOCK_TYPE_LABELS[week.block.type]} block, ${weekOfBlockPart(week)}`;
}

export function weekOfBlockShortText(week: WeekOfBlock): string {
  return `${BLOCK_TYPE_LABELS[week.block.type]}, ${weekOfBlockPart(week)}`;
}

export function dayLengthText(plan: DayPlan, exercisesById: ReadonlyMap<string, Exercise>): string {
  if (plan.kind === 'session') return estimatedDuration(estimatedMinutes(plan.session, exercisesById));
  return plan.kind === 'cardio' ? `${cardioMinutes(plan.cardio)} min` : '';
}
