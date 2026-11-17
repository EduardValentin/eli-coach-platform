import { format } from 'date-fns';
import type { ReactNode } from 'react';
import { WEEKDAY_LABELS, type CardioSession, type Weekday } from '../../domain/program';
import { cardioIntensitiesOf } from '../../domain/programCardio';
import { EYEBROW_CLASS } from '../typography';
import { cardVariants } from '../ui/card';
import { cn } from '../ui/utils';
import { CheckInDayNote } from './CheckInDayNote';
import { EffortKey } from './EffortKey';
import { InlineTextButton } from './InlineTextButton';
import type { PlacedTexts } from './programTextPlacement';
import { SegmentBlock, SegmentList } from './SegmentBlock';
import { SessionContent } from './SessionContent';
import { TextDisclosureGroup, TextDisclosurePanel, TextDisclosureTrigger } from './TextDisclosure';
import { dayAnchor, dayDateText, dayLengthOf, dayPlanName, nextTrainingDay, type DayContext, type WeekDay, type WeekView } from './weekView';

export function dayHeadingId(weekday: Weekday): string {
  return `${dayAnchor(weekday)}-heading`;
}

type DayAid = 'legend' | 'lowEnergy';

const AID_LABELS: Record<DayAid, string> = { legend: 'How to read this', lowEnergy: 'Low energy today?' };

function writtenAids(aids: readonly DayAid[], texts: PlacedTexts): DayAid[] {
  return aids.filter(aid => texts[aid].length > 0);
}

function DayAidTriggers({ aids }: { aids: readonly DayAid[] }) {
  if (aids.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-9">
      {aids.map(aid => (
        <TextDisclosureTrigger key={aid} value={aid}>
          {AID_LABELS[aid]}
        </TextDisclosureTrigger>
      ))}
    </div>
  );
}

function DayAidPanels({ aids, texts }: { aids: readonly DayAid[]; texts: PlacedTexts }) {
  return (
    <>
      {aids.map(aid => (
        <TextDisclosurePanel key={aid} value={aid} parts={texts[aid]} headingLevel="h4" />
      ))}
    </>
  );
}

type DayDetail = 'full' | 'compact';

function aidsOf(day: WeekDay, detail: DayDetail): DayAid[] {
  if (detail === 'compact') return [];
  if (day.plan.kind === 'session') return ['legend', 'lowEnergy'];
  return day.plan.kind === 'cardio' ? ['lowEnergy'] : [];
}

function weekAidsOf(week: WeekView): DayAid[] {
  return week.days.some(day => day.plan.kind === 'session') ? ['legend', 'lowEnergy'] : ['lowEnergy'];
}

export function WeekDayAids({ week, texts }: { week: WeekView; texts: PlacedTexts }) {
  const shown = writtenAids(weekAidsOf(week), texts);
  if (shown.length === 0) return null;
  return (
    <TextDisclosureGroup>
      <div data-parity="week-day-aids" className={cn(cardVariants({ variant: 'panel' }), 'overflow-hidden')}>
        <div className="px-4 py-1 @3xl:px-6">
          <DayAidTriggers aids={shown} />
        </div>
        <DayAidPanels aids={shown} texts={texts} />
      </div>
    </TextDisclosureGroup>
  );
}

type DayHeaderProps = { day: WeekDay; weekOfPlan: number; meta: string; tone: 'default' | 'quiet'; aids: readonly DayAid[] };

function DayHeader({ day, weekOfPlan, meta, tone, aids }: DayHeaderProps) {
  return (
    <div className="px-4 pt-4 pb-2 @3xl:px-6 @3xl:pt-6 @3xl:pb-3">
      <p className={cn(EYEBROW_CLASS, 'mb-1 flex flex-wrap items-center gap-x-2')}>
        {day.isToday && (
          <>
            <span className="text-text-primary">Today</span>
            <span aria-hidden="true">·</span>
          </>
        )}
        {dayDateText(day)}
      </p>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pb-1">
        <h3
          id={dayHeadingId(day.weekday)}
          tabIndex={-1}
          className={cn('font-serif text-2xl tracking-tight outline-none', { 'text-text-primary': tone === 'default', 'text-text-secondary': tone === 'quiet' })}
        >
          {dayPlanName(day.plan)}
        </h3>
        {meta && <p className="text-sm text-text-secondary tabular-nums">{meta}</p>}
      </div>
      {day.checkIn && (
        <div className="pb-1">
          <CheckInDayNote weekOfPlan={weekOfPlan} size="viewer" />
        </div>
      )}
      <DayAidTriggers aids={aids} />
    </div>
  );
}

function CardioContent({ cardio, context }: { cardio: CardioSession; context: DayContext }) {
  const intensities = cardioIntensitiesOf([cardio]);
  return (
    <>
      <EffortKey intensities={intensities} layout="panel" />
      <SegmentList segments={cardio.segments} size="viewer" className="border-t border-border-subtle first:border-t-0">
        {(segment, index) => (
          <SegmentBlock
            segment={segment}
            number={index + 1}
            count={cardio.segments.length}
            exercisesById={context.view.exercisesById}
            layout={{ size: 'viewer', heads: index === 0 ? 'shown' : 'hidden', effort: intensities.includes('moderate') ? 'wide' : 'narrow' }}
          />
        )}
      </SegmentList>
    </>
  );
}

type NextTrainingDayProps = { next: WeekDay; onOpenDay: (weekday: Weekday) => void };

function NextTrainingDay({ next, onOpenDay }: NextTrainingDayProps) {
  return (
    <div className="grid p-4 @3xl:px-6 @3xl:pt-3 @3xl:pb-4">
      <InlineTextButton weight="medium" trailing="onward" className="min-h-12 justify-self-start" onClick={() => onOpenDay(next.weekday)}>
        {`Next: ${dayPlanName(next.plan)}, ${next.date ? format(next.date, 'EEE d MMM') : WEEKDAY_LABELS[next.weekday]}`}
      </InlineTextButton>
    </div>
  );
}

type DayPanelProps = { day: WeekDay; context: DayContext; detail: DayDetail; onOpenDay: (weekday: Weekday) => void };

export function DayPanel({ day, context, detail, onOpenDay }: DayPanelProps) {
  const { plan } = day;
  const restAtAGlance = plan.kind === 'rest' && detail === 'compact';
  const aids = writtenAids(aidsOf(day, detail), context.texts);
  const next = restAtAGlance ? undefined : nextTrainingDay(context.week, day);
  let content: ReactNode = null;
  if (plan.kind === 'session') content = <SessionContent session={plan.session} context={context} />;
  else if (plan.kind === 'cardio') content = <CardioContent cardio={plan.cardio} context={context} />;
  else if (next) content = <NextTrainingDay next={next} onOpenDay={onOpenDay} />;

  return (
    <TextDisclosureGroup>
      <section
        id={dayAnchor(day.weekday)}
        aria-labelledby={dayHeadingId(day.weekday)}
        data-parity="day"
        className={cn(cardVariants({ variant: 'panel' }), 'scroll-mt-(--portal-top-bar-clearance) overflow-hidden')}
      >
        <DayHeader
          day={day}
          weekOfPlan={context.week.weekOfPlan}
          meta={dayLengthOf(day.plan, context.view.exercisesById)?.shown ?? ''}
          tone={restAtAGlance ? 'quiet' : 'default'}
          aids={aids}
        />
        <DayAidPanels aids={aids} texts={context.texts} />
        {content && <div className="border-t border-border-subtle">{content}</div>}
      </section>
    </TextDisclosureGroup>
  );
}
