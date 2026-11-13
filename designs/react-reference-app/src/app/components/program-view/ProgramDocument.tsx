import { format } from 'date-fns';
import { Fragment, type ReactNode } from 'react';
import { BLOCK_TYPE_LABELS, WEEKDAY_LABELS, WEEKDAYS, weekdayAbbreviation, weekCounts, type Block, type CardioSegment, type CardioSession, type RoundsSegment, type Session } from '../../domain/program';
import { blockDates, nextCheckpoint } from '../../domain/programCalendar';
import { cardioMinutes, roundsItemAmount, SEGMENT_KIND_LABELS } from '../../domain/programCardio';
import { fillTemplate, type GuideTextKey } from '../../domain/programTemplates';
import { printedTitle, programText, type BlockTextKey, type ProgramTextTarget } from '../../domain/programTexts';
import { estimatedMinutes } from '../../domain/sessionTiming';
import { counted } from '../../utils/counted';
import { formatJourneyDate } from '../../utils/journeyLabels';
import { DOCUMENT_LABEL_CLASS, DOCUMENT_NOTE_CLASS } from '../typography';
import { cn } from '../ui/utils';
import { BLOCK_SWATCH } from './blockColours';
import { DocumentEditingProvider, DocumentHeading, type DocumentEditing } from './documentEditing';
import { DocumentTextSlot, useShowsText } from './DocumentTextSlot';
import { Emphasised, parseTemplate, TemplateBody, type TemplateParagraph } from './ProgramText';
import { SessionTable } from './SessionTable';
import { TrackingTable } from './TrackingTable';
import { cardioSegmentText, coolDownLines, currentBlock, dayEntryLabel, exerciseName, warmUpLines, type ProgramView } from './programView';

const COACH_NAME = 'Eli';
const DISCLAIMER_TEXT = "Your coach's full disclaimer accompanies this program.";
const LIST_DASH = /^—\s*/;

const SECTION_TITLE_CLASS = 'font-serif text-document-section font-semibold text-balance text-text-primary';
const CARD_TITLE_CLASS = 'text-document-card font-semibold text-text-primary';
const PROSE_CLASS = 'max-w-measure space-y-document-tight text-document-body';
const BOX_CLASS = 'rounded-field border border-divider p-document-gap';
const LABEL_ABOVE_TITLE_CLASS = cn(DOCUMENT_LABEL_CLASS, 'mb-0.5');

const TITLE: ProgramTextTarget = { kind: 'version', key: 'title' };
const FOCUS: ProgramTextTarget = { kind: 'version', key: 'focus' };
const PERSONAL_NOTE: ProgramTextTarget = { kind: 'version', key: 'personalNote' };
const WHAT_CHANGED: ProgramTextTarget = { kind: 'version', key: 'whatChanged' };
const NUTRITION: ProgramTextTarget = { kind: 'version', key: 'nutrition' };
const LIFESTYLE: ProgramTextTarget = { kind: 'version', key: 'lifestyle' };

function guide(key: GuideTextKey): ProgramTextTarget {
  return { kind: 'guide', key };
}

function blockText(block: Block, key: BlockTextKey): ProgramTextTarget {
  return { kind: 'block', blockId: block.id, key };
}

function valueOf(view: ProgramView, target: ProgramTextTarget): string {
  return programText(view.version, target, view.program.language).value;
}

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

function blockLabel(view: ProgramView, block: Block): string {
  const { blocks } = view.version.content.plan;
  return `Block ${blocks.indexOf(block) + 1} of ${blocks.length} · ${counted(block.weeks, 'week')}`;
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
        <DocumentHeading level={2} className={SECTION_TITLE_CLASS}>
          {title}
        </DocumentHeading>
      </hgroup>
      {children}
    </section>
  );
}

function ParagraphsOf({ text }: { text: string }) {
  return <Prose paragraphs={parseTemplate(text).paragraphs} />;
}

function TitledProse({ text, fallbackTitle }: { text: string; fallbackTitle: string }) {
  const { title, paragraphs } = parseTemplate(text);
  return (
    <>
      <DocumentHeading level={2} className={SECTION_TITLE_CLASS}>
        {title || fallbackTitle}
      </DocumentHeading>
      <Prose paragraphs={paragraphs} />
    </>
  );
}

type TextSectionProps = {
  view: ProgramView;
  label: string;
  target: ProgramTextTarget;
  fallbackTitle: string;
  fill?: (text: string) => string;
};

function unchanged(text: string): string {
  return text;
}

function TextSection({ view, label, target, fallbackTitle, fill = unchanged }: TextSectionProps) {
  const shows = useShowsText(view, target);
  if (!shows) return null;
  const title = parseTemplate(fill(valueOf(view, target))).title || fallbackTitle;
  return (
    <section aria-label={title} data-print-keep>
      <p className={LABEL_ABOVE_TITLE_CLASS}>{label}</p>
      <DocumentTextSlot view={view} target={target} className="space-y-document-gap">
        {value => <TitledProse text={fill(value)} fallbackTitle={fallbackTitle} />}
      </DocumentTextSlot>
    </section>
  );
}

function RunningHeader({ text }: { text: string }) {
  return <style>{`@media print { @page { @top-left { content: ${JSON.stringify(text)}; } } }`}</style>;
}

function Cover({ view, block }: { view: ProgramView; block: Block | null }) {
  const { version } = view;
  const date = version.publishedAt ? format(version.publishedAt, 'd MMMM yyyy') : 'Draft';
  const showsNote = useShowsText(view, PERSONAL_NOTE);
  return (
    <header data-print-keep className="relative -mx-4 overflow-hidden bg-surface-subtle px-4 pt-7 pb-6 sm:-mx-[16mm] sm:px-[16mm]">
      {block && <span aria-hidden="true" className={cn('absolute inset-x-0 top-0 h-1.5', BLOCK_SWATCH[block.type])} />}
      <DocumentTextSlot view={view} target={TITLE} unwritten={<p className={DOCUMENT_LABEL_CLASS}>{printedTitle(version.content)}</p>}>
        {value => <p className={DOCUMENT_LABEL_CLASS}>{value}</p>}
      </DocumentTextSlot>
      <DocumentHeading level={1} className="mt-document-tight font-serif text-document-title font-semibold text-text-primary">
        {view.clientName}
      </DocumentHeading>
      <div className="mt-document-gap flex flex-wrap items-center gap-x-6 gap-y-2 text-document-body text-text-secondary">
        <p>{`Program · Version ${version.number} · ${date}`}</p>
        <p>{`Coach: ${COACH_NAME}`}</p>
        {block && (
          <p className="inline-flex items-center gap-2 rounded-full border border-divider bg-surface-base px-3 py-0.5 font-medium text-text-primary">
            <span aria-hidden="true" className={cn('size-2 rounded-full', BLOCK_SWATCH[block.type])} />
            {`${BLOCK_TYPE_LABELS[block.type]} block`}
          </p>
        )}
      </div>
      <DocumentTextSlot view={view} target={FOCUS} className="mt-document-gap">
        {value => <p className="max-w-measure font-serif text-document-card italic text-text-primary">{value}</p>}
      </DocumentTextSlot>
      {showsNote && (
        <figure className="mt-document-gap max-w-measure space-y-document-tight border-l-2 border-text-primary pl-4">
          <figcaption className={DOCUMENT_LABEL_CLASS}>{`A note from ${COACH_NAME}`}</figcaption>
          <DocumentTextSlot view={view} target={PERSONAL_NOTE}>
            {value => <ParagraphsOf text={value} />}
          </DocumentTextSlot>
        </figure>
      )}
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
      <DocumentHeading level={2} className={DOCUMENT_LABEL_CLASS}>
        At a glance
      </DocumentHeading>
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
            <span>{counted(block.weeks, 'week')}</span>
            {dates && <span>{`${formatJourneyDate(dates.start)} – ${formatJourneyDate(dates.end)}`}</span>}
          </li>
        );
      })}
    </ol>
  );
}

const LEGEND = guide('legend');
const LEGEND_FALLBACK_TITLE = 'How to read your session';

function Legend({ view }: { view: ProgramView }) {
  const shows = useShowsText(view, LEGEND);
  if (!shows) return null;
  const title = parseTemplate(valueOf(view, LEGEND)).title || LEGEND_FALLBACK_TITLE;
  return (
    <aside aria-label={title} data-print-keep className={cn(BOX_CLASS, 'bg-surface-subtle')}>
      <DocumentTextSlot view={view} target={LEGEND} className="space-y-document-tight">
        {value => <LegendBody text={value} />}
      </DocumentTextSlot>
    </aside>
  );
}

function LegendBody({ text }: { text: string }) {
  const { title, paragraphs } = parseTemplate(text);
  return (
    <>
      <DocumentHeading level={2} className={CARD_TITLE_CLASS}>
        {title || LEGEND_FALLBACK_TITLE}
      </DocumentHeading>
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
    </>
  );
}

function BlockSection({ view, block }: { view: ProgramView; block: Block }) {
  const intro = blockText(block, 'intro');
  const note = blockText(block, 'note');
  const showsNote = useShowsText(view, note);
  const fallbackTitle = `${BLOCK_TYPE_LABELS[block.type]} block`;
  const title = parseTemplate(valueOf(view, intro)).title || fallbackTitle;
  return (
    <section aria-label={title} className="space-y-document-gap">
      <div>
        <p className={LABEL_ABOVE_TITLE_CLASS}>{blockLabel(view, block)}</p>
        <DocumentTextSlot
          view={view}
          target={intro}
          className="space-y-document-gap"
          unwritten={
            <DocumentHeading level={2} className={SECTION_TITLE_CLASS}>
              {fallbackTitle}
            </DocumentHeading>
          }
        >
          {value => <TitledProse text={value} fallbackTitle={fallbackTitle} />}
        </DocumentTextSlot>
      </div>
      {showsNote && (
        <figure data-print-keep className="max-w-measure space-y-document-tight border-l-2 border-text-primary pl-4">
          <figcaption className={DOCUMENT_LABEL_CLASS}>{`A note from ${COACH_NAME}`}</figcaption>
          <DocumentTextSlot view={view} target={note}>
            {value => <ParagraphsOf text={value} />}
          </DocumentTextSlot>
        </figure>
      )}
      {block.calibrationWeek && (
        <DocumentTextSlot view={view} target={guide('calibration')}>
          {value => <ParagraphsOf text={value} />}
        </DocumentTextSlot>
      )}
    </section>
  );
}

function SplitSection({ view, block }: { view: ProgramView; block: Block }) {
  return <TextSection view={view} label="Split" target={blockText(block, 'split')} fallbackTitle="Your split" />;
}

function WeekTable({ block }: { block: Block }) {
  return (
    <Section label="Schedule" title="This week" print="keep">
      <table aria-label="This week" className="w-full table-fixed border-collapse text-document-table">
        <thead>
          <tr>
            {WEEKDAYS.map(weekday => (
              <th key={weekday} scope="col" className={cn(DOCUMENT_LABEL_CLASS, 'border-b border-text-primary px-1 py-1 text-left')}>
                {weekdayAbbreviation(weekday)}
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
  return (
    <DocumentHeading level={4} className={DOCUMENT_LABEL_CLASS}>
      {children}
    </DocumentHeading>
  );
}

function WarmUpText({ text }: { text: string }) {
  const { title, paragraphs } = parseTemplate(text);
  return (
    <>
      <SubHeading>{title || 'Warm-up'}</SubHeading>
      <Prose paragraphs={paragraphs} />
    </>
  );
}

function EverySession({ view, block }: { view: ProgramView; block: Block }) {
  const hasCoolDown = block.sessions.some(session => session.coolDown.enabled);
  return (
    <div data-print-keep className={cn(BOX_CLASS, 'space-y-document-gap')}>
      <DocumentHeading level={3} className={CARD_TITLE_CLASS}>
        Every session
      </DocumentHeading>
      <DocumentTextSlot view={view} target={guide('warmUp')} className="space-y-document-tight">
        {value => <WarmUpText text={value} />}
      </DocumentTextSlot>
      <DocumentTextSlot view={view} target={guide('progression')}>
        {value => <ParagraphsOf text={value} />}
      </DocumentTextSlot>
      {hasCoolDown && (
        <DocumentTextSlot view={view} target={guide('coolDown')}>
          {value => <ParagraphsOf text={value} />}
        </DocumentTextSlot>
      )}
      <DocumentTextSlot view={view} target={blockText(block, 'missedDay')}>
        {value => <ParagraphsOf text={value} />}
      </DocumentTextSlot>
      <DocumentTextSlot view={view} target={guide('noWeight')}>
        {value => <p className={DOCUMENT_NOTE_CLASS}>{value}</p>}
      </DocumentTextSlot>
    </div>
  );
}

function CardHeader({ title, minutes }: { title: string; minutes: number }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b-2 border-text-primary pb-1.5">
      <DocumentHeading level={3} className={CARD_TITLE_CLASS}>
        {title}
      </DocumentHeading>
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
        <CardHeader title={session.name} minutes={estimatedMinutes(session, view.exercisesById)} />
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
      <p className="font-semibold">{`${SEGMENT_KIND_LABELS.rounds} · ${segment.rounds} rounds`}</p>
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
  const fill = (text: string) => fillTemplate(text, { steps: block.dailySteps.toLocaleString('en-US') });
  return <TextSection view={view} label="Cardio and steps" target={guide('steps')} fallbackTitle="Daily steps" fill={fill} />;
}

function WhatChanged({ view }: { view: ProgramView }) {
  const shows = useShowsText(view, WHAT_CHANGED);
  const { number } = view.version;
  if (number <= 1 || !shows) return null;
  return (
    <Section label="Update" title={`What changed in v${number}`} print="keep">
      <DocumentTextSlot view={view} target={WHAT_CHANGED}>
        {value => <ParagraphsOf text={value} />}
      </DocumentTextSlot>
    </Section>
  );
}

type ProgramDocumentProps = { view: ProgramView; editing?: DocumentEditing };

export function ProgramDocument({ view, editing }: ProgramDocumentProps) {
  return (
    <DocumentEditingProvider editing={editing ?? null}>
      <DocumentPages view={view} />
    </DocumentEditingProvider>
  );
}

function DocumentPages({ view }: { view: ProgramView }) {
  const { version } = view;
  const block = currentBlock(view);

  return (
    <article
      data-parity-root="ProgramDocument"
      data-program-document
      aria-label={`${view.clientName} program`}
      className="mx-auto w-full max-w-[210mm] space-y-document-section bg-surface-base px-4 pb-10 text-document-body text-text-primary sm:px-[16mm] sm:pb-[18mm]"
    >
      <RunningHeader text={`${view.clientName} · Program v${version.number}`} />
      <Cover view={view} block={block} />
      {block && <AtAGlance view={view} block={block} />}
      <WhatChanged view={view} />
      <Section label="Overview" title="Your plan" print="keep">
        <PlanStrip view={view} />
      </Section>
      <Legend view={view} />
      {block && (
        <Fragment key={block.id}>
          <BlockSection view={view} block={block} />
          <SplitSection view={view} block={block} />
          <WeekTable block={block} />
          <SessionsSection view={view} block={block} />
          <CardioSection view={view} block={block} />
          <StepsSection view={view} block={block} />
        </Fragment>
      )}
      <TextSection view={view} label="Low-energy days" target={guide('lowEnergy')} fallbackTitle="Low-energy session" />
      <TextSection view={view} label="Beyond training" target={NUTRITION} fallbackTitle="Nutrition" />
      <TextSection view={view} label="Beyond training" target={LIFESTYLE} fallbackTitle="Lifestyle" />
      <footer data-print-keep className={cn(BOX_CLASS, 'space-y-document-tight')}>
        <p className={CARD_TITLE_CLASS}>Disclaimer</p>
        <p className={DOCUMENT_NOTE_CLASS}>{DISCLAIMER_TEXT}</p>
      </footer>
    </article>
  );
}
