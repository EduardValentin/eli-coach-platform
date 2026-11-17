import { format } from 'date-fns';
import { Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { WEEKDAY_LABELS, type CardioIntensity, type CardioSession, type Weekday } from '../../domain/program';
import { CARDIO_INTENSITY_LABELS, CARDIO_TALK_TEST, cardioIntensitiesOf } from '../../domain/programCardio';
import { IconHint } from '../IconHint';
import { EYEBROW_CLASS, LABEL_CLASS } from '../typography';
import { cardVariants } from '../ui/card';
import { cn } from '../ui/utils';
import { CheckInDot } from './CheckInDot';
import { InlineTextButton } from './InlineTextButton';
import { IntensityValue } from './IntensityValue';
import { TemplateBody } from './ProgramText';
import type { PlacedTexts } from './programTextPlacement';
import { dailyStepsText } from './programView';
import { SegmentBlock } from './SegmentBlock';
import { SessionContent } from './SessionContent';
import { TextDisclosureGroup, TextDisclosurePanel, TextDisclosureTrigger } from './TextDisclosure';
import { dayAnchor, dayLengthText, dayPlanName, nextTrainingDay, type DayContext, type WeekDay, type WeekView } from './weekView';

export function dayHeadingId(weekday: Weekday): string {
  return `${dayAnchor(weekday)}-heading`;
}

function dayTitle(day: WeekDay): string {
  const weekday = WEEKDAY_LABELS[day.weekday];
  return day.date ? `${weekday} ${format(day.date, 'd MMMM')}` : weekday;
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

type DayHeaderProps = { day: WeekDay; meta: string; tone: 'default' | 'quiet'; aids: readonly DayAid[] };

function DayHeader({ day, meta, tone, aids }: DayHeaderProps) {
  return (
    <div className="px-4 pt-4 pb-2 @3xl:px-6 @3xl:pt-6 @3xl:pb-3">
      <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className={cn(EYEBROW_CLASS, 'flex flex-wrap items-center gap-x-2')}>
          {day.isToday && (
            <>
              <span className="text-text-primary">Today</span>
              <span aria-hidden="true">·</span>
            </>
          )}
          {dayTitle(day)}
        </p>
        {day.checkIn && (
          <p className="inline-flex items-center gap-1.5 text-xs font-medium text-text-primary">
            <CheckInDot />
            Check-in form due
          </p>
        )}
      </div>
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
      <DayAidTriggers aids={aids} />
    </div>
  );
}

type EffortProps = { intensities: readonly CardioIntensity[] };

function EffortKey({ intensities }: EffortProps) {
  if (intensities.length === 0) return null;
  return (
    <div data-parity="effort-key" className="grid gap-2 bg-surface-base px-4 py-3 @3xl:hidden">
      <p className={LABEL_CLASS}>Effort</p>
      <dl className="grid gap-2">
        {intensities.map(intensity => (
          <div key={intensity} className="flex items-center gap-3">
            <dt>
              <IntensityValue intensity={intensity} />
            </dt>
            <dd className="text-sm text-text-secondary">{CARDIO_TALK_TEST[intensity]}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function EffortHint({ intensities }: EffortProps) {
  if (intensities.length === 0) return null;
  return (
    <IconHint label="What each effort means" icon={<Info aria-hidden="true" size={14} />} size="compact" tone="muted" side="top" className="@max-3xl:hidden" parity="effort-hint">
      {intensities.map(intensity => (
        <p key={intensity}>
          <strong className="font-semibold">{CARDIO_INTENSITY_LABELS[intensity]}:</strong> {CARDIO_TALK_TEST[intensity]}
        </p>
      ))}
    </IconHint>
  );
}

function CardioContent({ cardio, context }: { cardio: CardioSession; context: DayContext }) {
  const intensities = cardioIntensitiesOf(cardio);
  return (
    <>
      <EffortKey intensities={intensities} />
      <ol className="border-t border-border-subtle first:border-t-0">
        {cardio.segments.map((segment, index) => (
          <li key={segment.id} className="border-t border-border-subtle p-4 first:border-t-0 @3xl:px-6 @3xl:py-5">
            <SegmentBlock
              segment={segment}
              number={index + 1}
              count={cardio.segments.length}
              exercisesById={context.view.exercisesById}
              layout={{ heads: index === 0 ? 'shown' : 'hidden', effort: intensities.includes('moderate') ? 'wide' : 'narrow' }}
              effortHint={index === 0 && <EffortHint intensities={intensities} />}
            />
          </li>
        ))}
      </ol>
    </>
  );
}

type RestContentProps = { day: WeekDay; context: DayContext; onOpenDay: (weekday: Weekday) => void };

function RestContent({ day, context, onOpenDay }: RestContentProps) {
  const next = nextTrainingDay(context.week, day);
  return (
    <div className="grid gap-3 p-4 @3xl:px-6 @3xl:pt-5 @3xl:pb-6">
      <p className="max-w-prose text-base text-text-secondary">
        Keep to your daily steps: <strong className="font-semibold text-text-primary tabular-nums">{dailyStepsText(context.week.block)}</strong>.
      </p>
      {context.texts.restDay.length > 0 && <TemplateBody paragraphs={context.texts.restDay} className="text-base text-text-secondary" />}
      {next && (
        <InlineTextButton weight="medium" trailing="onward" className="min-h-12 justify-self-start" onClick={() => onOpenDay(next.weekday)}>
          {`Next: ${dayPlanName(next.plan)}, ${next.date ? format(next.date, 'EEE d MMM') : WEEKDAY_LABELS[next.weekday]}`}
        </InlineTextButton>
      )}
    </div>
  );
}

type DayPanelProps = { day: WeekDay; context: DayContext; detail: DayDetail; onOpenDay: (weekday: Weekday) => void };

export function DayPanel({ day, context, detail, onOpenDay }: DayPanelProps) {
  const { plan } = day;
  const restAtAGlance = plan.kind === 'rest' && detail === 'compact';
  const aids = writtenAids(aidsOf(day, detail), context.texts);
  let content: ReactNode = null;
  if (plan.kind === 'session') content = <SessionContent session={plan.session} context={context} />;
  else if (plan.kind === 'cardio') content = <CardioContent cardio={plan.cardio} context={context} />;
  else if (!restAtAGlance) content = <RestContent day={day} context={context} onOpenDay={onOpenDay} />;

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
          meta={restAtAGlance ? `Daily steps ${dailyStepsText(context.week.block)}` : dayLengthText(day.plan, context.view.exercisesById)}
          tone={restAtAGlance ? 'quiet' : 'default'}
          aids={aids}
        />
        <DayAidPanels aids={aids} texts={context.texts} />
        {content && <div className="border-t border-border-subtle">{content}</div>}
      </section>
    </TextDisclosureGroup>
  );
}
