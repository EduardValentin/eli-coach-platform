import { format } from 'date-fns';
import type { ReactNode } from 'react';
import { BLOCK_TYPE_LABELS, WEEKDAY_LABELS, WEEKDAYS, weekCounts, type Block, type CardioSegment, type CardioSession, type RoundsSegment, type Session } from '../../domain/program';
import { blockDates, nextCheckpoint } from '../../domain/programCalendar';
import { cardioMinutes, roundsItemAmount } from '../../domain/programCardio';
import { fillTemplate } from '../../domain/programTemplates';
import { estimatedMinutes } from '../../domain/sessionTiming';
import { formatJourneyDate } from '../../utils/journeyLabels';
import { DOCUMENT_LABEL_CLASS, DOCUMENT_NOTE_CLASS } from '../typography';
import { cn } from '../ui/utils';
import { BLOCK_SWATCH } from './blockColours';
import { Emphasised, LIFESTYLE_FALLBACK, NUTRITION_FALLBACK, parseTemplate, template, TemplateBody, type TemplateParagraph } from './ProgramText';
import { SessionTable } from './SessionTable';
import { TrackingTable } from './TrackingTable';
import { cardioSegmentText, coolDownLines, currentBlock, dayEntryLabel, exerciseName, warmUpLines, type ProgramView } from './programView';

const COACH_NAME = 'Eli';
const DISCLAIMER_TEXT = "Your coach's full disclaimer accompanies this program.";
const NO_WEIGHT_NOTE = 'No weight listed? Pick one that lets you finish the set at the RIR shown.';
const LIST_DASH = /^—\s*/;

const SECTION_TITLE_CLASS = 'font-serif text-document-section font-semibold text-balance text-text-primary';
const CARD_TITLE_CLASS = 'text-document-card font-semibold text-text-primary';
const PROSE_CLASS = 'max-w-measure space-y-document-tight text-document-body';
const BOX_CLASS = 'rounded-md border border-divider p-document-gap';

function sessionsPerWeek(block: Block): string {
  const { sessions, cardio } = weekCounts(block);
  return cardio > 0 ? `${sessions} strength · ${cardio} cardio` : `${sessions} strength`;
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

function weeksText(weeks: number): string {
  return `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`;
}

function blockLabel(view: ProgramView, block: Block): string {
  const { blocks } = view.version.content.plan;
  return `Block ${blocks.indexOf(block) + 1} of ${blocks.length} · ${weeksText(block.weeks)}`;
}

function Prose({ paragraphs }: { paragraphs: readonly TemplateParagraph[] }) {
  return <TemplateBody paragraphs={paragraphs} className={PROSE_CLASS} />;
}

type SectionProps = { label: string; title: string; children: ReactNode; print?: 'keep' };

function Section({ label, title, children, print }: SectionProps) {
  return (
    <section aria-label={title} data-print-keep={print === 'keep' ? '' : undefined} className="space-y-document-gap">
      <hgroup data-print-heading className="space-y-0.5">
        <p className={DOCUMENT_LABEL_CLASS}>{label}</p>
        <h2 className={SECTION_TITLE_CLASS}>{title}</h2>
      </hgroup>
      {children}
    </section>
  );
}

type TemplateSectionProps = { label: string; text: string; fallbackTitle: string };

function TemplateSection({ label, text, fallbackTitle }: TemplateSectionProps) {
  const { title, paragraphs } = parseTemplate(text);
  return (
    <Section label={label} title={title || fallbackTitle} print="keep">
      <Prose paragraphs={paragraphs} />
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
      <p className={DOCUMENT_LABEL_CLASS}>Training program</p>
      <h1 className="mt-document-tight font-serif text-document-title font-semibold text-text-primary">{view.clientName}</h1>
      <div className="mt-document-gap flex flex-wrap items-center gap-x-6 gap-y-2 text-document-body text-text-secondary">
        <p>{`Program · Version ${version.number} · ${date}`}</p>
        <p>{`Coach: ${COACH_NAME}`}</p>
        {block && (
          <p className="inline-flex items-center gap-2 rounded-full border border-divider bg-white px-3 py-0.5 font-medium text-text-primary">
            <span aria-hidden="true" className={cn('size-2 rounded-full', BLOCK_SWATCH[block.type])} />
            {`${BLOCK_TYPE_LABELS[block.type]} block`}
          </p>
        )}
      </div>
      {version.content.header.focus && <p className="mt-document-gap max-w-measure font-serif text-document-card italic text-text-primary">{version.content.header.focus}</p>}
    </header>
  );
}

function Reading({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5 border-l-2 border-divider pl-3">
      <dt className={DOCUMENT_LABEL_CLASS}>{label}</dt>
      <dd className="text-document-body font-medium tabular-nums text-text-primary">{value}</dd>
    </div>
  );
}

function AtAGlance({ view, block }: { view: ProgramView; block: Block }) {
  return (
    <section aria-label="At a glance" data-print-keep className="space-y-document-gap">
      <h2 className={DOCUMENT_LABEL_CLASS}>At a glance</h2>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-document-gap">
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
    <ol className="flex gap-1">
      {blocks.map((block, index) => {
        const dates = dayOne ? blockDates(blocks, index, dayOne) : null;
        const isCurrent = position.status === 'in-plan' && position.blockIndex === index;
        return (
          <li
            key={block.id}
            aria-current={isCurrent ? 'true' : undefined}
            style={{ flexGrow: block.weeks, flexBasis: 0 }}
            className={cn('flex min-w-28 flex-col gap-0.5', DOCUMENT_NOTE_CLASS, { 'text-text-primary': isCurrent })}
          >
            <span aria-hidden="true" className={cn('mb-1 h-1.5 rounded-full', BLOCK_SWATCH[block.type])} />
            <span className="text-document-body font-semibold text-text-primary">
              {BLOCK_TYPE_LABELS[block.type]}
              {isCurrent && <span className="font-normal text-text-secondary"> · now</span>}
            </span>
            <span>{weeksText(block.weeks)}</span>
            {dates && <span>{`${formatJourneyDate(dates.start)} – ${formatJourneyDate(dates.end)}`}</span>}
          </li>
        );
      })}
    </ol>
  );
}

function Legend({ view }: { view: ProgramView }) {
  const { title: parsedTitle, paragraphs } = parseTemplate(template(view, 'legend'));
  const title = parsedTitle || 'How to read your session';
  return (
    <aside aria-label={title} data-print-keep className={cn(BOX_CLASS, 'space-y-document-tight bg-surface-subtle')}>
      <h2 className={CARD_TITLE_CLASS}>{title}</h2>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-document-table">
        {paragraphs.map(paragraph => {
          const term = paragraph.lead?.replace(/:$/, '') ?? '';
          const description = paragraph.body.replace(LIST_DASH, '');
          return (
            <div key={`${term}${description}`} className="contents">
              <dt className="font-semibold text-text-primary">{term}</dt>
              <dd className="max-w-measure text-text-primary">
                <Emphasised text={description} />
              </dd>
            </div>
          );
        })}
      </dl>
    </aside>
  );
}

function BlockSection({ view, block }: { view: ProgramView; block: Block }) {
  const intro = parseTemplate(block.introText || template(view, `block.${block.type}`));
  const calibration = parseTemplate(template(view, 'calibration'));
  return (
    <Section label={blockLabel(view, block)} title={intro.title || `${BLOCK_TYPE_LABELS[block.type]} block`}>
      <Prose paragraphs={intro.paragraphs} />
      {block.clientNote && (
        <figure data-print-keep className="max-w-measure space-y-document-tight border-l-2 border-text-primary pl-4">
          <figcaption className={DOCUMENT_LABEL_CLASS}>{`A note from ${COACH_NAME}`}</figcaption>
          <Prose paragraphs={parseTemplate(block.clientNote).paragraphs} />
        </figure>
      )}
      {block.calibrationWeek && <Prose paragraphs={calibration.paragraphs} />}
    </Section>
  );
}

function SplitSection({ block }: { block: Block }) {
  return <TemplateSection label="Split" text={block.split.text} fallbackTitle="Your split" />;
}

function WeekTable({ block }: { block: Block }) {
  return (
    <Section label="Schedule" title="This week" print="keep">
      <table aria-label="This week" className="w-full table-fixed border-collapse text-document-table">
        <thead>
          <tr>
            {WEEKDAYS.map(weekday => (
              <th key={weekday} scope="col" className={cn(DOCUMENT_LABEL_CLASS, 'border-b border-text-primary px-1 py-1 text-left')}>
                {WEEKDAY_LABELS[weekday].slice(0, 3)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {WEEKDAYS.map(weekday => {
              const isRest = block.calendar[weekday].kind === 'rest';
              return (
                <td key={weekday} className={cn('border-b border-divider px-1 py-2 align-top font-medium', { 'font-normal text-text-secondary': isRest })}>
                  {dayEntryLabel(block, weekday)}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </Section>
  );
}

function SubHeading({ children }: { children: ReactNode }) {
  return <h4 className={DOCUMENT_LABEL_CLASS}>{children}</h4>;
}

function EverySession({ view, block }: { view: ProgramView; block: Block }) {
  const warmUp = parseTemplate(template(view, 'warmUp'));
  const hasCoolDown = block.sessions.some(session => session.coolDown.enabled);
  return (
    <div data-print-keep className={cn(BOX_CLASS, 'space-y-document-gap')}>
      <h3 className={CARD_TITLE_CLASS}>Every session</h3>
      <div className="space-y-document-tight">
        <SubHeading>{warmUp.title || 'Warm-up'}</SubHeading>
        <Prose paragraphs={warmUp.paragraphs} />
      </div>
      <Prose paragraphs={parseTemplate(template(view, 'progression')).paragraphs} />
      {hasCoolDown && <Prose paragraphs={parseTemplate(template(view, 'coolDown')).paragraphs} />}
      <p className={DOCUMENT_NOTE_CLASS}>{NO_WEIGHT_NOTE}</p>
    </div>
  );
}

function CardHeader({ title, minutes }: { title: string; minutes: number }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b-2 border-text-primary pb-1.5">
      <h3 className={CARD_TITLE_CLASS}>{title}</h3>
      <p className={cn(DOCUMENT_NOTE_CLASS, 'tabular-nums')}>{`About ${minutes} min`}</p>
    </div>
  );
}

function ItemList({ lines }: { lines: readonly string[] }) {
  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-1 text-document-table text-text-primary">
      {lines.map(line => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );
}

type SessionCardProps = { view: ProgramView; block: Block; session: Session };

function SessionCard({ view, block, session }: SessionCardProps) {
  const warmUp = warmUpLines(session, view.exercisesById);
  const coolDown = coolDownLines(session, view.exercisesById);
  return (
    <section aria-label={session.name} data-print-card className="space-y-document-gap">
      <div data-print-heading className="space-y-document-gap">
        <CardHeader title={session.name} minutes={estimatedMinutes(session)} />
        {warmUp.length > 0 && (
          <div className="space-y-1">
            <SubHeading>Warm-up</SubHeading>
            <ItemList lines={warmUp} />
          </div>
        )}
      </div>
      <SessionTable session={session} exercisesById={view.exercisesById} />
      {session.coolDown.enabled && (
        <div className="space-y-1">
          <SubHeading>Cool-down</SubHeading>
          {session.coolDown.note && <p className="max-w-measure text-document-table text-text-primary">{session.coolDown.note}</p>}
          {coolDown.length > 0 && <ItemList lines={coolDown} />}
        </div>
      )}
      <TrackingTable session={session} block={block} exercisesById={view.exercisesById} />
    </section>
  );
}

function RoundsLines({ view, segment }: { view: ProgramView; segment: RoundsSegment }) {
  const items = segment.items.map(item => `${exerciseName(item.exerciseId, view.exercisesById)} · ${roundsItemAmount(item)}`);
  return (
    <div className="space-y-1">
      <p className="font-semibold">{`${segment.rounds} rounds`}</p>
      {items.length > 0 && <ItemList lines={items} />}
      {segment.easySeconds > 0 && <p className="text-text-secondary">{`${segment.easySeconds} s easy between exercises`}</p>}
      {segment.restBetweenRoundsSeconds > 0 && <p className="text-text-secondary">{`${segment.restBetweenRoundsSeconds} s rest between rounds`}</p>}
    </div>
  );
}

function SegmentItem({ view, segment }: { view: ProgramView; segment: CardioSegment }) {
  return <li className="pl-1">{segment.kind === 'rounds' ? <RoundsLines view={view} segment={segment} /> : cardioSegmentText(segment, view.exercisesById)}</li>;
}

function CardioCard({ view, cardio }: { view: ProgramView; cardio: CardioSession }) {
  return (
    <section aria-label={cardio.name} data-print-keep className="space-y-document-tight">
      <CardHeader title={cardio.name} minutes={cardioMinutes(cardio)} />
      <ol className="list-decimal space-y-document-tight pl-5 text-document-table marker:text-text-secondary">
        {cardio.segments.map(segment => (
          <SegmentItem key={segment.id} view={view} segment={segment} />
        ))}
      </ol>
    </section>
  );
}

function SessionsSection({ view, block }: { view: ProgramView; block: Block }) {
  return (
    <Section label="Training" title="Your sessions">
      <EverySession view={view} block={block} />
      <div className="space-y-document-section">
        {block.sessions.map(session => (
          <SessionCard key={session.id} view={view} block={block} session={session} />
        ))}
      </div>
    </Section>
  );
}

function CardioSection({ view, block }: { view: ProgramView; block: Block }) {
  if (block.cardioSessions.length === 0) return null;
  return (
    <Section label="Training" title="Your cardio">
      <div className="space-y-document-gap">
        {block.cardioSessions.map(cardio => (
          <CardioCard key={cardio.id} view={view} cardio={cardio} />
        ))}
      </div>
    </Section>
  );
}

function StepsSection({ view, block }: { view: ProgramView; block: Block }) {
  const text = fillTemplate(template(view, 'steps'), { steps: block.dailySteps.toLocaleString('en-US') });
  return <TemplateSection label="Cardio and steps" text={text} fallbackTitle="Daily steps" />;
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
      className="mx-auto w-full max-w-[210mm] space-y-document-section bg-white px-4 pb-10 text-document-body text-text-primary sm:px-[16mm] sm:pb-[18mm]"
    >
      <RunningHeader text={`${view.clientName} · Program v${version.number}`} />
      <Cover view={view} block={block} />
      {block && <AtAGlance view={view} block={block} />}
      {version.number > 1 && version.whatChanged && (
        <Section label="Update" title={`What changed in v${version.number}`} print="keep">
          <Prose paragraphs={parseTemplate(version.whatChanged).paragraphs} />
        </Section>
      )}
      <Section label="Overview" title="Your plan" print="keep">
        <PlanStrip view={view} />
      </Section>
      <Legend view={view} />
      {block && (
        <>
          <BlockSection view={view} block={block} />
          <SplitSection block={block} />
          <WeekTable block={block} />
          <SessionsSection view={view} block={block} />
          <CardioSection view={view} block={block} />
          <StepsSection view={view} block={block} />
        </>
      )}
      {program.cycleMode === 'adapted' && <TemplateSection label="Cycle" text={template(view, 'cycle')} fallbackTitle="Listening to your cycle" />}
      <TemplateSection label="Low-energy days" text={template(view, 'lowEnergy')} fallbackTitle="Low-energy session" />
      <TemplateSection label="Beyond training" text={content.nutritionNotes || NUTRITION_FALLBACK} fallbackTitle="Nutrition" />
      <TemplateSection label="Beyond training" text={content.lifestyleNotes || LIFESTYLE_FALLBACK} fallbackTitle="Lifestyle" />
      <footer data-print-keep className={cn(BOX_CLASS, 'space-y-document-tight')}>
        <p className={CARD_TITLE_CLASS}>Disclaimer</p>
        <p className={DOCUMENT_NOTE_CLASS}>{DISCLAIMER_TEXT}</p>
      </footer>
    </article>
  );
}
