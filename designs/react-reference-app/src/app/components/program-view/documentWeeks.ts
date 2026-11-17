import type { CardioSession, Row, Session } from '../../domain/program';
import { blockSpan, currentPosition, shownWeekOfPlan } from '../../domain/programCalendar';
import { blocksOf, type ProgramView } from './programView';
import { weekViewAt, type WeekDay, type WeekView } from './weekView';

export const GLANCE_ANCHOR = 'program-at-a-glance';

export type SessionDay = WeekDay & { plan: { kind: 'session'; session: Session } };
export type CardioDay = WeekDay & { plan: { kind: 'cardio'; cardio: CardioSession } };
type TrainingDay = SessionDay | CardioDay;

/** The week the version was published in: a document reprinted mid-plan starts there, not at week 1. */
export function publicationWeek(view: ProgramView): number {
  const { dayOne } = view;
  const { publishedAt } = view.version;
  if (!dayOne || !publishedAt) return 1;
  const blocks = blocksOf(view);
  return shownWeekOfPlan(blocks, currentPosition(blocks, dayOne, publishedAt));
}

export function weeksOfBlock(view: ProgramView, blockIndex: number, from: number): WeekView[] {
  const { startWeek, endWeek } = blockSpan(blocksOf(view), blockIndex);
  const first = Math.max(startWeek, from);
  return Array.from({ length: Math.max(endWeek - first + 1, 0) }, (_, offset) => weekViewAt(view, first + offset));
}

export function firstWeekOfBlock(view: ProgramView, blockIndex: number): WeekView {
  return weekViewAt(view, blockSpan(blocksOf(view), blockIndex).startWeek);
}

export function weekAnchor(weekOfPlan: number): string {
  return `week-${weekOfPlan}`;
}

export function dayPageAnchor(week: Pick<WeekView, 'weekOfPlan'>, day: Pick<WeekDay, 'weekday'>): string {
  return `${weekAnchor(week.weekOfPlan)}-${day.weekday}`;
}

export function loggedRows(session: Session): Row[] {
  return session.rows.filter(row => row.exerciseId !== '' && row.sets.length > 0);
}

function hasPage(day: WeekDay): day is TrainingDay {
  if (day.plan.kind === 'session') return loggedRows(day.plan.session).length > 0;
  return day.plan.kind === 'cardio' && day.plan.cardio.segments.length > 0;
}

export function isCardioDay(day: TrainingDay): day is CardioDay {
  return day.plan.kind === 'cardio';
}

export function trainingDays(week: WeekView): TrainingDay[] {
  return week.isWritten ? week.days.filter(hasPage) : [];
}

export function strengthDayOf(week: WeekView, weekday: WeekDay['weekday']): SessionDay | undefined {
  return trainingDays(week).find((day): day is SessionDay => day.weekday === weekday && day.plan.kind === 'session');
}
