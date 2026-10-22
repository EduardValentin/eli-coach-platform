import { format } from 'date-fns';
import type { ReactNode } from 'react';
import { BLOCK_TYPE_LABELS, WEEKDAYS, type Block, type CardioSession, type Session, type Weekday } from '../../domain/program';
import { blockDates, nextCheckpoint } from '../../domain/programCalendar';
import { cardioMinutes } from '../../domain/programCardio';
import { estimatedMinutes } from '../../domain/programSuggestions';
import { fillTemplate } from '../../domain/programTemplates';
import { SPLIT_TEMPLATES } from '../../domain/splitTemplates';
import { formatJourneyDate } from '../../utils/journeyLabels';
import { BLOCK_SWATCH } from '../coach-portal/program/program-constants';
import { LABEL_CLASS } from '../typography';
import { cn } from '../ui/utils';
import { Emphasised, headedText, LIFESTYLE_FALLBACK, nonEmptyLines, NUTRITION_FALLBACK, template } from './ProgramText';
import { SessionTable } from './SessionTable';
import { TrackingTable } from './TrackingTable';
import { cardioDayLabel, cardioSegmentText, currentBlock, dayEntries, warmUpLines, type ProgramView } from './programView';

const COACH_NAME = 'Eli';
const DISCLAIMER_PLACEHOLDER = 'Disclaimer (page 8) — placeholder';
const NO_WEIGHT_NOTE = 'No weight listed? Pick one that lets you finish the set at the RIR shown.';
const LEGEND_LINE = /^\*\*(.+?):?\*\*\s*(?:—\s*)?(.*)$/;

const WEEKDAY_ABBREVIATIONS: Record<Weekday, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

const H2_CLASS = 'font-serif text-2xl font-semibold leading-tight text-text-primary';
const H3_CLASS = 'font-serif text-lg font-semibold leading-snug text-text-primary';
const BOX_CLASS = 'rounded-md border border-divider p-4';

function entryLabel(block: Block, weekday: Weekday): string {
  const entry = dayEntries(block, weekday);
  if (entry.kind === 'session') return block.sessions.find(session => session.id === entry.sessionId)?.name ?? 'Session';
  if (entry.kind === 'cardio') return cardioDayLabel(block, weekday);
  return 'Rest';
}

function sessionsPerWeek(block: Block): string {
  const entries = Object.values(block.calendar);
  const strength = entries.filter(entry => entry.kind === 'session').length;
  const cardio = entries.filter(entry => entry.kind === 'cardio').length;
  return cardio > 0 ? `${strength} strength · ${cardio} cardio` : `${strength} strength`;
}

function nowReading(view: ProgramView, block: Block): string {
  const { position } = view;
  if (position.status === 'in-plan') return `${BLOCK_TYPE_LABELS[block.type]} · week ${position.weekOfBlock} of ${block.weeks}`;
  if (position.status === 'ended') return 'Plan complete';
  return view.dayOne ? `Starts ${formatJourneyDate(view.dayOne)}` : 'Starts once your plan is published';
}

function nextCheckInReading(view: ProgramView): string {
  if (!view.dayOne || view.position.status !== 'in-plan') return 'Set when your plan starts';
  return format(nextCheckpoint(view.dayOne, view.preferredWeekday, view.today), 'EEEE, d MMMM');
}

function TextLines({ text }: { text: string }) {
  return (
    <div className="space-y-2 leading-relaxed text-text-primary">
      {nonEmptyLines(text).map((line, index) => (
        <p key={index}>
          <Emphasised text={line} />
        </p>
      ))}
    </div>
  );
}

function LeadText({ text }: { text: string }) {
  const { heading, body } = headedText(text);
  return (
    <div className="space-y-2">
      {heading && (
        <p data-print-heading className="font-semibold text-text-primary">
          {heading}
        </p>
      )}
      <TextLines text={body} />
    </div>
  );
}

type SectionProps = { title: string; children: ReactNode; className?: string; print?: 'keep' };

function Section({ title, children, className, print }: SectionProps) {
  return (
    <section aria-label={title} data-print-keep={print === 'keep' ? '' : undefined} className={cn('grid grid-cols-1 gap-3', className)}>
      <h2 data-print-heading className={H2_CLASS}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function TitledTemplate({ text, fallbackTitle }: { text: string; fallbackTitle: string }) {
  const { heading, body } = headedText(text);
  return (
    <Section title={heading ?? fallbackTitle} print="keep">
      <TextLines text={body} />
    </Section>
  );
}

function RunningHeader({ text }: { text: string }) {
  return <style>{`@media print { @page { @top-left { content: ${JSON.stringify(text)}; } } }`}</style>;
}

function Cover({ view, block }: { view: ProgramView; block: Block | null }) {
  const { version } = view;
  const date = version.publishedAt ? format(version.publishedAt, 'd MMMM yyyy') : 'Draft';
  return (
    <header data-print-keep className="relative -mx-4 overflow-hidden bg-surface-subtle px-4 pt-7 pb-6 sm:-mx-[16mm] sm:px-[16mm]">
      {block && <span aria-hidden="true" className={cn('absolute inset-x-0 top-0 h-1.5', BLOCK_SWATCH[block.type])} />}
      <p className={LABEL_CLASS}>Training program</p>
      <h1 className="mt-1 font-serif text-4xl font-semibold leading-tight text-text-primary">{view.clientName}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-text-secondary">
        <p>{`Program · Version ${version.number} · ${date}`}</p>
        <p>{`Coach: ${COACH_NAME}`}</p>
        {block && (
          <p className="inline-flex items-center gap-2 rounded-full border border-divider bg-white px-3 py-0.5 font-medium text-text-primary">
            <span aria-hidden="true" className={cn('size-2 rounded-full', BLOCK_SWATCH[block.type])} />
            {`${BLOCK_TYPE_LABELS[block.type]} block`}
          </p>
        )}
      </div>
      {version.content.header.focus && <p className="mt-4 max-w-prose font-serif text-lg italic text-text-primary">{version.content.header.focus}</p>}
    </header>
  );
}

function Reading({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5 border-l-2 border-divider pl-3">
      <dt className={LABEL_CLASS}>{label}</dt>
      <dd className="font-medium tabular-nums text-text-primary">{value}</dd>
    </div>
  );
}

function AtAGlance({ view, block }: { view: ProgramView; block: Block }) {
  return (
    <section aria-label="At a glance" data-print-keep className="grid gap-3">
      <h2 className={LABEL_CLASS}>At a glance</h2>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
        <Reading label="Now" value={nowReading(view, block)} />
        <Reading label="Next check-in form" value={nextCheckInReading(view)} />
        <Reading label="Daily steps" value={block.dailySteps.toLocaleString('en-US')} />
        <Reading label="Sessions per week" value={sessionsPerWeek(block)} />
      </dl>
    </section>
  );
}

function PlanStrip({ view }: { view: ProgramView }) {
  const { blocks } = view.version.content.plan;
  const { dayOne, position } = view;
  return (
    <ol data-print-keep className="flex gap-1">
      {blocks.map((block, index) => {
        const dates = dayOne ? blockDates(blocks, index, dayOne) : null;
        const isCurrent = position.status === 'in-plan' && position.blockIndex === index;
        return (
          <li
            key={block.id}
            aria-current={isCurrent ? 'true' : undefined}
            style={{ flexGrow: block.weeks, flexBasis: 0 }}
            className={cn('grid min-w-28 content-start gap-0.5 text-xs text-text-secondary', { 'text-text-primary': isCurrent })}
          >
            <span aria-hidden="true" className={cn('mb-1 h-1.5 rounded-full', BLOCK_SWATCH[block.type])} />
            <span className="text-sm font-semibold text-text-primary">
              {BLOCK_TYPE_LABELS[block.type]}
              {isCurrent && <span className="font-normal text-text-secondary"> · now</span>}
            </span>
            <span>{`${block.weeks} ${block.weeks === 1 ? 'week' : 'weeks'}`}</span>
            {dates && <span>{`${formatJourneyDate(dates.start)} – ${formatJourneyDate(dates.end)}`}</span>}
          </li>
        );
      })}
    </ol>
  );
}

function Legend({ view }: { view: ProgramView }) {
  const { heading, body } = headedText(template(view, 'legend'));
  const title = heading ?? 'How to read your session';
  return (
    <aside aria-label={title} data-print-keep className={cn(BOX_CLASS, 'grid gap-3 bg-surface-subtle')}>
      <h2 className={H3_CLASS}>{title}</h2>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 text-sm">
        {nonEmptyLines(body).map(line => {
          const match = LEGEND_LINE.exec(line);
          const [term, description] = match ? [match[1], match[2]] : ['', line];
          return (
            <div key={line} className="contents">
              <dt className="font-semibold text-text-primary">{term}</dt>
              <dd className="text-text-primary">{description}</dd>
            </div>
          );
        })}
      </dl>
    </aside>
  );
}

function BlockSection({ view, block }: { view: ProgramView; block: Block }) {
  const split = SPLIT_TEMPLATES[block.split.shape].label;
  return (
    <Section title={`${BLOCK_TYPE_LABELS[block.type]} block`}>
      <LeadText text={block.introText || template(view, `block.${block.type}`)} />
      {block.clientNote && (
        <figure className="border-l-2 border-text-primary pl-4">
          <figcaption className={LABEL_CLASS}>{`A note from ${COACH_NAME}`}</figcaption>
          <TextLines text={block.clientNote} />
        </figure>
      )}
      {block.calibrationWeek && <TextLines text={template(view, 'calibration')} />}
      <div data-print-keep className="grid gap-2 pt-2">
        <h3 data-print-heading className={H3_CLASS}>{`Your split: ${split}`}</h3>
        <TextLines text={headedText(block.split.text).body} />
      </div>
    </Section>
  );
}

function WeekTable({ block }: { block: Block }) {
  return (
    <Section title="Your week" print="keep">
      <table aria-label="Your week" data-print-keep className="w-full table-fixed border-collapse text-sm">
        <thead>
          <tr>
            {WEEKDAYS.map(weekday => (
              <th key={weekday} scope="col" className="border-b border-text-primary px-1 py-1 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
                {WEEKDAY_ABBREVIATIONS[weekday]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {WEEKDAYS.map(weekday => {
              const isRest = dayEntries(block, weekday).kind === 'rest';
              return (
                <td key={weekday} className={cn('border-b border-divider px-1 py-2 align-top font-medium', { 'font-normal text-text-secondary': isRest })}>
                  {entryLabel(block, weekday)}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </Section>
  );
}

function EverySession({ view, block }: { view: ProgramView; block: Block }) {
  const warmUp = headedText(template(view, 'warmUp'));
  const hasCoolDown = block.sessions.some(session => session.coolDown.enabled);
  return (
    <div data-print-keep className={cn(BOX_CLASS, 'grid gap-3 text-sm')}>
      <h3 className={H3_CLASS}>Every session</h3>
      <div className="grid gap-1">
        <p className="font-semibold text-text-primary">{warmUp.heading ?? 'Warm-up'}</p>
        <TextLines text={warmUp.body} />
      </div>
      <TextLines text={template(view, 'progression')} />
      {hasCoolDown && <TextLines text={template(view, 'coolDown')} />}
      <p className="text-text-secondary">{NO_WEIGHT_NOTE}</p>
    </div>
  );
}

function CardHeader({ title, minutes }: { title: string; minutes: number }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b-2 border-text-primary pb-1.5">
      <h3 className={H3_CLASS}>{title}</h3>
      <p className="text-sm tabular-nums text-text-secondary">{`About ${minutes} min`}</p>
    </div>
  );
}

type SessionCardProps = { view: ProgramView; block: Block; session: Session };

function SessionCard({ view, block, session }: SessionCardProps) {
  const warmUp = warmUpLines(session, view.exercisesById);
  return (
    <section aria-label={session.name} data-print-card className="grid gap-3">
      <div data-print-heading className="grid gap-3">
        <CardHeader title={session.name} minutes={estimatedMinutes(session)} />
        {warmUp.length > 0 && (
          <p className="text-sm">
            <span className="font-semibold">Warm-up: </span>
            {warmUp.join(', ')}
          </p>
        )}
      </div>
      <SessionTable session={session} exercisesById={view.exercisesById} />
      <TrackingTable session={session} block={block} exercisesById={view.exercisesById} />
      {session.coolDown.enabled && <p className="text-sm text-text-secondary">Finish with the cool-down.</p>}
    </section>
  );
}

function CardioCard({ view, cardio }: { view: ProgramView; cardio: CardioSession }) {
  return (
    <section aria-label={cardio.name} data-print-keep className="grid gap-2">
      <CardHeader title={cardio.name} minutes={cardioMinutes(cardio)} />
      <ol className="grid list-decimal gap-1 pl-5 text-sm">
        {cardio.segments.map(segment => (
          <li key={segment.id}>{cardioSegmentText(segment, view.exercisesById)}</li>
        ))}
      </ol>
    </section>
  );
}

function SessionsSection({ view, block }: { view: ProgramView; block: Block }) {
  return (
    <Section title="Your sessions" className="gap-6">
      <EverySession view={view} block={block} />
      {block.sessions.map(session => (
        <SessionCard key={session.id} view={view} block={block} session={session} />
      ))}
      {block.cardioSessions.map(cardio => (
        <CardioCard key={cardio.id} view={view} cardio={cardio} />
      ))}
    </Section>
  );
}

function StepsSection({ view, block }: { view: ProgramView; block: Block }) {
  return (
    <Section title="Cardio and steps" print="keep">
      <LeadText text={fillTemplate(template(view, 'steps'), { steps: block.dailySteps.toLocaleString('en-US') })} />
    </Section>
  );
}

export function ProgramDocument({ view }: { view: ProgramView }) {
  const { program, version } = view;
  const { content } = version;
  const block = currentBlock(view);

  return (
    <article
      data-parity-root="ProgramDocument"
      data-program-document
      aria-label={`${view.clientName} program`}
      className="mx-auto grid w-full max-w-[210mm] grid-cols-1 gap-8 bg-white px-4 pb-10 text-base text-text-primary sm:px-[16mm] sm:pb-[18mm]"
    >
      <RunningHeader text={`${view.clientName} · Program v${version.number}`} />
      <Cover view={view} block={block} />
      {block && <AtAGlance view={view} block={block} />}
      {version.number > 1 && version.whatChanged && (
        <Section title={`What changed in v${version.number}`} print="keep">
          <TextLines text={version.whatChanged} />
        </Section>
      )}
      <Section title="Your plan" print="keep">
        <PlanStrip view={view} />
      </Section>
      <Legend view={view} />
      {block && (
        <>
          <BlockSection view={view} block={block} />
          <WeekTable block={block} />
          <SessionsSection view={view} block={block} />
          <StepsSection view={view} block={block} />
        </>
      )}
      {program.cycleMode === 'adapted' && <TitledTemplate text={template(view, 'cycle')} fallbackTitle="Listening to your cycle" />}
      <Section title="Low-energy session" print="keep">
        <TextLines text={template(view, 'lowEnergy')} />
      </Section>
      <Section title="Nutrition" print="keep">
        <TextLines text={content.nutritionNotes || NUTRITION_FALLBACK} />
      </Section>
      <Section title="Lifestyle" print="keep">
        <TextLines text={content.lifestyleNotes || LIFESTYLE_FALLBACK} />
      </Section>
      <footer data-print-keep className={cn(BOX_CLASS, 'text-sm text-text-secondary')}>
        {DISCLAIMER_PLACEHOLDER}
      </footer>
    </article>
  );
}
