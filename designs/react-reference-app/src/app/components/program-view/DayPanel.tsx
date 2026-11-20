import type { ReactNode } from 'react';
import type { CardioIntensity, CardioSession, Weekday } from '../../domain/program';
import { cardioIntensitiesOf } from '../../domain/programCardio';
import { EYEBROW_CLASS } from '../typography';
import { cardVariants } from '../ui/card';
import { cn } from '../ui/utils';
import { CheckInDayNote } from './CheckInDayNote';
import { EffortKey } from './EffortKey';
import type { PlacedTexts } from './programTextPlacement';
import { SegmentBlock, SegmentList } from './SegmentBlock';
import { SessionContent } from './SessionContent';
import { DisclosurePanel, TextDisclosureGroup, TextDisclosurePanel, TextDisclosureTrigger } from './TextDisclosure';
import { dayAnchor, dayDateText, dayLengthOf, dayPlanName, type DayContext, type WeekDay } from './weekView';

function dayHeadingId(weekday: Weekday): string {
  return `${dayAnchor(weekday)}-heading`;
}

type DayAid = 'legend' | 'effort' | 'lowEnergy';

/** What a day's aids explain: the coach's written texts, and the efforts its cardio asks for. */
type AidSources = { texts: PlacedTexts; intensities: readonly CardioIntensity[] };

const AID_LABELS: Record<DayAid, string> = { legend: 'How to read this', effort: 'Effort levels', lowEnergy: 'Low energy today?' };

function writtenAids(aids: readonly DayAid[], sources: AidSources): DayAid[] {
  return aids.filter(aid => (aid === 'effort' ? sources.intensities.length > 0 : sources.texts[aid].length > 0));
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

function DayAidPanels({ aids, sources }: { aids: readonly DayAid[]; sources: AidSources }) {
  return (
    <>
      {aids.map(aid =>
        aid === 'effort' ? (
          <DisclosurePanel key={aid} value={aid}>
            <EffortKey intensities={sources.intensities} layout="panel" />
          </DisclosurePanel>
        ) : (
          <TextDisclosurePanel key={aid} value={aid} parts={sources.texts[aid]} headingLevel="h4" />
        ),
      )}
    </>
  );
}

function aidsOf(day: WeekDay): DayAid[] {
  if (day.plan.kind === 'session') return ['legend', 'lowEnergy'];
  return day.plan.kind === 'cardio' ? ['effort', 'lowEnergy'] : [];
}

function cardioOf(days: readonly WeekDay[]): CardioSession[] {
  return days.flatMap(day => (day.plan.kind === 'cardio' ? [day.plan.cardio] : []));
}

type DayHeaderProps = { day: WeekDay; weekOfPlan: number; meta: string; aids: readonly DayAid[] };

function DayHeader({ day, weekOfPlan, meta, aids }: DayHeaderProps) {
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
        <h3 id={dayHeadingId(day.weekday)} tabIndex={-1} className="font-serif text-2xl tracking-tight text-text-primary outline-none">
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
  );
}

type DayPanelProps = { day: WeekDay; context: DayContext };

export function DayPanel({ day, context }: DayPanelProps) {
  const { plan } = day;
  const sources = { texts: context.texts, intensities: cardioIntensitiesOf(cardioOf([day])) };
  const aids = writtenAids(aidsOf(day), sources);
  let content: ReactNode = null;
  if (plan.kind === 'session') content = <SessionContent session={plan.session} context={context} />;
  else if (plan.kind === 'cardio') content = <CardioContent cardio={plan.cardio} context={context} />;

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
          aids={aids}
        />
        <DayAidPanels aids={aids} sources={sources} />
        {content && <div className="border-t border-border-subtle">{content}</div>}
      </section>
    </TextDisclosureGroup>
  );
}
