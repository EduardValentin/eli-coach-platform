import { format } from 'date-fns';
import { Fragment, useId, type ReactNode } from 'react';
import { BLOCK_TYPE_LABELS, positionLabel, warmUpItemText, type Block, type CardioSegment, type CardioSession, type RoundsSegment, type Session } from '../../domain/program';
import { blockDates, planWeeks } from '../../domain/programCalendar';
import { CARDIO_INTENSITY_TEXT, cardioMinutes, roundsItemAmount } from '../../domain/programCardio';
import { fillTemplate, type GuideTextKey } from '../../domain/programTemplates';
import { printedTitle, programText, type BlockTextKey, type ProgramTextTarget } from '../../domain/programTexts';
import { estimatedMinutes } from '../../domain/sessionTiming';
import { counted } from '../../utils/counted';
import {
  DOCUMENT_CARD_TITLE_CLASS,
  DOCUMENT_HEAD_CLASS,
  DOCUMENT_LABEL_CLASS,
  DOCUMENT_NOTE_CLASS,
  DOCUMENT_PROSE_CLASS,
  DOCUMENT_SECTION_TITLE_CLASS,
  DOCUMENT_VALUE_CLASS,
} from '../typography';
import { cn } from '../ui/utils';
import { BlockCalendar } from './BlockCalendar';
import { BLOCK_RULE, BLOCK_SWATCH } from './blockColours';
import { DocumentEditingProvider, DocumentHeading, useDocumentEditing, type DocumentEditing } from './documentEditing';
import { DocumentTextSlot, OptionalMark, useShowsText } from './DocumentTextSlot';
import { ExerciseLink } from './ExerciseLink';
import { PositionBadge } from './PositionBadge';
import { Emphasised, parseTemplate, TemplateBody, type TemplateParagraph } from './ProgramText';
import { SessionTable } from './SessionTable';
import { currentBlock, exerciseName, type ProgramView } from './programView';

const COACH_NAME = 'Eli';
const DISCLAIMER_TEXT = "See your coach's disclaimer.";
const TERM_SEPARATOR_MARK = '—';
const LIST_DASH = /^—\s*/;
const LEAD_IN = /^([^:?,.]{3,40}[:?,])\s+(.+)$/;
const LEAD_IN_END = /[:,]$/;
const TERM_SEPARATOR = /\s*[,/]\s*/;
const MARK_TERM = /^[A-D]\d?$/;
const SHORT_DATE = 'd MMM';

const COVER_LABEL_CLASS = cn(DOCUMENT_LABEL_CLASS, 'text-text-primary');
const BOX_CLASS = 'rounded-field border border-divider p-document-gap';
const TERM_ROW_CLASS = 'grid gap-x-4 gap-y-0.5 text-document-table sm:grid-cols-[10rem_minmax(0,1fr)]';
const TERM_CLASS = 'font-semibold text-text-primary';
const NOTE_FIGURE_CLASS = 'max-w-measure space-y-document-tight border-l-2 border-text-primary pl-4';
const FOCUS_CLASS = 'max-w-measure font-serif text-document-card italic text-text-primary';
const LABEL_FOCUS_TARGET = -1;
const EDITED_TEXT_TYPOGRAPHY = { body: DOCUMENT_PROSE_CLASS, heading: DOCUMENT_SECTION_TITLE_CLASS };
const EDITED_LEAD_IN_ROWS_CLASS =
  'space-y-1 text-document-table max-sm:[&>p>strong:first-child]:block sm:[&>p:has(>strong:first-child)]:grid sm:[&>p]:grid-cols-[10rem_minmax(0,1fr)] sm:[&>p]:gap-x-4 sm:[&>p>:not(:first-child)]:col-start-2';
const EDITED_LEGEND_TYPOGRAPHY = { body: cn(EDITED_LEAD_IN_ROWS_CLASS, '[&>h3]:mb-document-tight'), heading: DOCUMENT_CARD_TITLE_CLASS };
const EDITED_TERM_ROW_TYPOGRAPHY = {
  body: cn(
    EDITED_LEAD_IN_ROWS_CLASS,
    'sm:[&:has(>h3)]:grid sm:[&:has(>h3)]:grid-cols-[10rem_minmax(0,1fr)] sm:[&:has(>h3)]:gap-x-4 sm:[&>h3]:row-start-1 sm:[&:has(>h3)>:not(h3)]:col-start-2',
  ),
  heading: cn(TERM_CLASS, 'text-document-table'),
};

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

function withLeadIn(paragraphs: readonly TemplateParagraph[]): TemplateParagraph[] {
  const [first, ...rest] = paragraphs;
  const match = first && first.lead === undefined ? LEAD_IN.exec(first.body) : null;
  return match ? [{ lead: match[1], body: match[2] }, ...rest] : [...paragraphs];
}

type TermAndBody = { term: string; paragraphs: TemplateParagraph[] };

function termAndBody(text: string): TermAndBody {
  const { title, paragraphs } = parseTemplate(text);
  if (title) return { term: title, paragraphs };
  const [first, ...rest] = withLeadIn(paragraphs);
  if (first?.lead === undefined) return { term: '', paragraphs };
  return { term: first.lead.replace(LEAD_IN_END, ''), paragraphs: [{ body: first.body }, ...rest] };
}

function opensWith(paragraphs: readonly TemplateParagraph[], title: string): boolean {
  return paragraphs[0]?.body.toLowerCase().startsWith(title.toLowerCase()) ?? false;
}

function Prose({ paragraphs }: { paragraphs: readonly TemplateParagraph[] }) {
  return <TemplateBody paragraphs={paragraphs} className={DOCUMENT_PROSE_CLASS} />;
}

type SectionProps = { title: string; children: ReactNode; print?: 'keep'; headingId?: string };

function Section({ title, children, print, headingId }: SectionProps) {
  return (
    <section aria-label={title} data-print-keep={print === 'keep' ? '' : undefined} className="space-y-document-gap">
      <DocumentHeading id={headingId} tabIndex={headingId ? LABEL_FOCUS_TARGET : undefined} level={2} className={DOCUMENT_SECTION_TITLE_CLASS}>
        {title}
      </DocumentHeading>
      {children}
    </section>
  );
}

function ParagraphsOf({ text }: { text: string }) {
  return <Prose paragraphs={parseTemplate(text).paragraphs} />;
}

function TitledProse({ text, fallbackTitle }: { text: string; fallbackTitle: string }) {
  const { title, paragraphs } = parseTemplate(text);
  if (!title && opensWith(paragraphs, fallbackTitle)) return <Prose paragraphs={withLeadIn(paragraphs)} />;
  return (
    <>
      <DocumentHeading level={2} className={DOCUMENT_SECTION_TITLE_CLASS}>
        {title || fallbackTitle}
      </DocumentHeading>
      <Prose paragraphs={paragraphs} />
    </>
  );
}

type TextSectionProps = {
  view: ProgramView;
  target: ProgramTextTarget;
  fallbackTitle: string;
  fill?: (text: string) => string;
};

function unchanged(text: string): string {
  return text;
}

function TextSection({ view, target, fallbackTitle, fill = unchanged }: TextSectionProps) {
  const shows = useShowsText(view, target);
  if (!shows) return null;
  const title = parseTemplate(fill(valueOf(view, target))).title || fallbackTitle;
  return (
    <section aria-label={title} data-print-keep>
      <DocumentTextSlot
        view={view}
        target={target}
        label={{ text: fallbackTitle, level: 2, className: DOCUMENT_SECTION_TITLE_CLASS }}
        className="space-y-document-gap"
      >
        {value => <TitledProse text={fill(value)} fallbackTitle={fallbackTitle} />}
      </DocumentTextSlot>
    </section>
  );
}

function RunningHeader({ text }: { text: string }) {
  return <style>{`@media print { @page { @top-left { content: ${JSON.stringify(text)}; } } @page :first { @top-left { content: none; } } }`}</style>;
}

function runningHeaderText(view: ProgramView, block: Block | null): string {
  const parts = [view.clientName, `v${view.version.number}`, ...(block ? [BLOCK_TYPE_LABELS[block.type]] : [])];
  return parts.join(' · ');
}

function NoteFromCoach({ view, target }: { view: ProgramView; target: ProgramTextTarget }) {
  const captionId = useId();
  const editing = useDocumentEditing();
  return (
    <figure data-print-keep className={NOTE_FIGURE_CLASS}>
      <figcaption id={captionId} tabIndex={editing ? LABEL_FOCUS_TARGET : undefined} className={DOCUMENT_HEAD_CLASS}>
        {`A note from ${COACH_NAME}`}
        <OptionalMark view={view} target={target} />
      </figcaption>
      <DocumentTextSlot view={view} target={target} labelledBy={captionId}>
        {value => <ParagraphsOf text={value} />}
      </DocumentTextSlot>
    </figure>
  );
}

function Cover({ view }: { view: ProgramView }) {
  const { version } = view;
  const date = version.publishedAt ? format(version.publishedAt, 'd MMMM yyyy') : 'Draft';
  const showsNote = useShowsText(view, PERSONAL_NOTE);
  return (
    <header data-print-keep className="relative -mx-4 overflow-hidden bg-surface-subtle px-4 pt-7 pb-6 sm:-mx-[16mm] sm:px-[16mm]">
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5 bg-text-primary" />
      <DocumentTextSlot
        view={view}
        target={TITLE}
        typography={{ body: COVER_LABEL_CLASS }}
        unwritten={<p className={COVER_LABEL_CLASS}>{printedTitle(version.content)}</p>}
      >
        {value => <p className={COVER_LABEL_CLASS}>{value}</p>}
      </DocumentTextSlot>
      <DocumentHeading level={1} className="mt-document-tight font-serif text-document-title font-semibold text-text-primary">
        {view.clientName}
      </DocumentHeading>
      <p className="mt-document-tight text-document-body text-text-secondary">{`Version ${version.number} · ${date} · Coach ${COACH_NAME}`}</p>
      <DocumentTextSlot view={view} target={FOCUS} className="mt-document-gap" typography={{ body: FOCUS_CLASS }}>
        {value => <p className={FOCUS_CLASS}>{value}</p>}
      </DocumentTextSlot>
      {showsNote && (
        <div className="mt-document-gap">
          <NoteFromCoach view={view} target={PERSONAL_NOTE} />
        </div>
      )}
    </header>
  );
}

const LATER_LABELS_GIVE_WAY = 1000;
const ALIGNED_LABELS_FROM_WIDTH = [
  'flex-row',
  'flex-row',
  '@min-[24rem]:flex-row',
  '@min-[36rem]:flex-row',
  '@min-[48rem]:flex-row',
  '@min-[60rem]:flex-row',
  '@min-[72rem]:flex-row',
];

function labelShare(blocks: readonly Block[], block: Block): string {
  return `calc((100% - ${blocks.length - 1} * var(--spacing)) * ${block.weeks / planWeeks(blocks)})`;
}

function PlanStrip({ view }: { view: ProgramView }) {
  const { blocks } = view.version.content.plan;
  const { dayOne, position } = view;
  return (
    <section aria-label="Plan" data-print-keep className="@container space-y-document-tight">
      <span aria-hidden="true" className="flex h-1.5 gap-1">
        {blocks.map(block => (
          <span key={block.id} style={{ flexGrow: block.weeks, flexBasis: 0 }} className={cn('rounded-full', BLOCK_SWATCH[block.type])} />
        ))}
      </span>
      <ol className={cn('flex flex-col gap-x-1 gap-y-2 text-document-table', ALIGNED_LABELS_FROM_WIDTH[blocks.length])}>
        {blocks.map((block, index) => {
          const dates = dayOne ? blockDates(blocks, index, dayOne) : null;
          const isCurrent = position.status === 'in-plan' && position.blockIndex === index;
          return (
            <li
              key={block.id}
              aria-current={isCurrent ? 'true' : undefined}
              style={{ flexBasis: labelShare(blocks, block), flexShrink: LATER_LABELS_GIVE_WAY ** index }}
              className="min-w-max whitespace-nowrap"
            >
              <span className="flex items-center gap-1.5">
                <span className="font-semibold text-text-primary">{BLOCK_TYPE_LABELS[block.type]}</span>
                {isCurrent && <span className="rounded-full bg-text-primary px-1.5 text-document-note font-semibold text-surface-base">Now</span>}
              </span>
              <span className="block text-text-secondary tabular-nums">
                {counted(block.weeks, 'week')}
                {dates && ` · ${format(dates.start, SHORT_DATE)}–${format(dates.end, SHORT_DATE)}`}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function LegendTerm({ term }: { term: string }) {
  const marks = term.split(TERM_SEPARATOR);
  if (!marks.every(mark => MARK_TERM.test(mark))) return term;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {marks.map((mark, index) => (
        <Fragment key={mark}>
          {index > 0 && <span className="sr-only">, </span>}
          <PositionBadge label={mark} size="xs" />
        </Fragment>
      ))}
    </span>
  );
}

const LEGEND = guide('legend');
const LEGEND_FALLBACK_TITLE = 'How to read your session';
const LINKS_TERM = 'Exercise names';
const LINKS_DEFINITION = 'Tap one for its video and how-to.';

function Legend({ view }: { view: ProgramView }) {
  const shows = useShowsText(view, LEGEND);
  const editing = useDocumentEditing();
  if (!shows) return null;
  const title = parseTemplate(valueOf(view, LEGEND)).title || LEGEND_FALLBACK_TITLE;
  return (
    <aside aria-label={title} data-print-keep className={cn(BOX_CLASS, 'bg-surface-subtle')}>
      <DocumentTextSlot
        view={view}
        target={LEGEND}
        label={{ text: LEGEND_FALLBACK_TITLE, level: 2, className: DOCUMENT_CARD_TITLE_CLASS }}
        className="space-y-document-tight"
        typography={EDITED_LEGEND_TYPOGRAPHY}
        leadSeparator={TERM_SEPARATOR_MARK}
      >
        {value => <LegendBody text={value} />}
      </DocumentTextSlot>
      {editing && (
        <dl className="mt-1">
          <LinksRow />
        </dl>
      )}
    </aside>
  );
}

function LinksRow() {
  return (
    <div className={TERM_ROW_CLASS}>
      <dt className={TERM_CLASS}>{LINKS_TERM}</dt>
      <dd className="max-w-measure text-text-primary">{LINKS_DEFINITION}</dd>
    </div>
  );
}

function LegendBody({ text }: { text: string }) {
  const { title, paragraphs } = parseTemplate(text);
  const editing = useDocumentEditing();
  return (
    <>
      <DocumentHeading level={2} className={DOCUMENT_CARD_TITLE_CLASS}>
        {title || LEGEND_FALLBACK_TITLE}
      </DocumentHeading>
      <dl className="space-y-1">
        {paragraphs.map(paragraph => {
          const term = paragraph.lead?.replace(LEAD_IN_END, '') ?? '';
          const description = paragraph.body.replace(LIST_DASH, '');
          return (
            <div key={`${term}${description}`} className={TERM_ROW_CLASS}>
              <dt className={TERM_CLASS}>
                <LegendTerm term={term} />
              </dt>
              <dd className="max-w-measure text-text-primary">
                <Emphasised text={description} />
              </dd>
            </div>
          );
        })}
        {!editing && <LinksRow />}
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
      <DocumentTextSlot
        view={view}
        target={intro}
        label={{ text: fallbackTitle, level: 2, className: DOCUMENT_SECTION_TITLE_CLASS }}
        className="space-y-document-gap"
        unwritten={
          <DocumentHeading level={2} className={DOCUMENT_SECTION_TITLE_CLASS}>
            {fallbackTitle}
          </DocumentHeading>
        }
      >
        {value => <TitledProse text={value} fallbackTitle={fallbackTitle} />}
      </DocumentTextSlot>
      {showsNote && <NoteFromCoach view={view} target={note} />}
      {block.calibrationWeek && (
        <DocumentTextSlot view={view} target={guide('calibration')}>
          {value => <ParagraphsOf text={value} />}
        </DocumentTextSlot>
      )}
    </section>
  );
}

function TermRow({ text }: { text: string }) {
  const { term, paragraphs } = termAndBody(text);
  return (
    <div className={TERM_ROW_CLASS}>
      <p className={TERM_CLASS}>{term}</p>
      <TemplateBody paragraphs={paragraphs} className="max-w-measure space-y-1 text-document-table" />
    </div>
  );
}

function EverySessionRow({ view, target }: { view: ProgramView; target: ProgramTextTarget }) {
  return (
    <DocumentTextSlot view={view} target={target} typography={EDITED_TERM_ROW_TYPOGRAPHY} leadSeparator={TERM_SEPARATOR_MARK}>
      {value => <TermRow text={value} />}
    </DocumentTextSlot>
  );
}

function EverySession({ view, block }: { view: ProgramView; block: Block }) {
  const hasCoolDown = block.sessions.some(session => session.coolDown.enabled);
  return (
    <section aria-label="Every session" data-print-keep className={cn(BOX_CLASS, 'space-y-document-tight')}>
      <DocumentHeading level={2} className={DOCUMENT_CARD_TITLE_CLASS}>
        Every session
      </DocumentHeading>
      <EverySessionRow view={view} target={guide('warmUp')} />
      <EverySessionRow view={view} target={guide('progression')} />
      {hasCoolDown && <EverySessionRow view={view} target={guide('coolDown')} />}
      <EverySessionRow view={view} target={blockText(block, 'missedDay')} />
      <EverySessionRow view={view} target={guide('noWeight')} />
    </section>
  );
}

type CardHeaderProps = { title: string; minutes: number; rule: string; level: 2 | 3 };

function CardHeader({ title, minutes, rule, level }: CardHeaderProps) {
  return (
    <div className={cn('flex items-baseline justify-between gap-4 border-b-2 pb-1.5', rule)}>
      <DocumentHeading level={level} className={DOCUMENT_CARD_TITLE_CLASS}>
        {title}
      </DocumentHeading>
      <p className={cn(DOCUMENT_VALUE_CLASS, 'text-document-table whitespace-nowrap')}>
        <span aria-hidden="true">{`~${minutes} min`}</span>
        <span className="sr-only">{`About ${minutes} min`}</span>
      </p>
    </div>
  );
}

type RoutineItem = { key: string; exerciseId: string; amount: string };

function ItemList({ view, items }: { view: ProgramView; items: readonly RoutineItem[] }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-0.5 text-document-table text-text-primary">
      {items.map(item => (
        <li key={item.key}>
          <ExerciseLink exerciseId={item.exerciseId} exercisesById={view.exercisesById} />
          {` · ${item.amount}`}
        </li>
      ))}
    </ul>
  );
}

function RoutineLine({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline gap-x-4 gap-y-0.5 max-sm:flex-col">
      <DocumentHeading level={3} className={cn(DOCUMENT_HEAD_CLASS, 'shrink-0')}>
        {title}
      </DocumentHeading>
      <div className="min-w-0 space-y-0.5">{children}</div>
    </div>
  );
}

function SwapsList({ view, session }: { view: ProgramView; session: Session }) {
  const { exercisesById } = view;
  const rows = session.rows.filter(row => row.exerciseId !== '' && row.substitutions.some(id => exercisesById.has(id)));
  if (rows.length === 0) return null;
  return (
    <section aria-label={`${session.name} swaps`} data-print-keep className="space-y-1.5 border-t border-divider pt-document-tight">
      <DocumentHeading level={3} className={DOCUMENT_HEAD_CLASS}>
        Swaps
      </DocumentHeading>
      <dl className="space-y-1 text-document-table">
        {rows.map(row => (
          <div key={row.id} className="grid gap-x-3 gap-y-0.5 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
            <dt className="flex items-baseline gap-2 font-semibold text-text-primary">
              <PositionBadge label={positionLabel(session, row)} size="xs" />{' '}
              {exerciseName(row.exerciseId, exercisesById)}
            </dt>
            <dd className="flex items-baseline gap-2 max-sm:pl-7">
              <span aria-hidden="true" className="text-text-secondary">
                →
              </span>
              <span className="sr-only">Swap for </span>
              <span>
                {row.substitutions
                  .filter(id => exercisesById.has(id))
                  .map((id, index) => (
                    <Fragment key={id}>
                      {index > 0 && ', '}
                      <ExerciseLink exerciseId={id} exercisesById={exercisesById} />
                    </Fragment>
                  ))}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

type SessionCardProps = { view: ProgramView; block: Block; session: Session };

function SessionCard({ view, block, session }: SessionCardProps) {
  const warmUp = session.warmUp.items.map(item => ({ key: item.id, exerciseId: item.exerciseId, amount: warmUpItemText(item) }));
  const coolDown = session.coolDown.items.map(item => ({ key: item.id, exerciseId: item.exerciseId, amount: `${item.seconds} s` }));
  return (
    <section aria-label={session.name} data-print-card className="space-y-document-tight">
      <div data-print-heading className="space-y-document-tight">
        <CardHeader title={session.name} minutes={estimatedMinutes(session, view.exercisesById)} rule={BLOCK_RULE[block.type]} level={2} />
        {warmUp.length > 0 && (
          <RoutineLine title="Warm-up">
            <ItemList view={view} items={warmUp} />
          </RoutineLine>
        )}
      </div>
      <SessionTable session={session} block={block} exercisesById={view.exercisesById} />
      {session.coolDown.enabled && (
        <RoutineLine title="Cool-down">
          {session.coolDown.note && <p className="max-w-measure text-document-table text-text-primary">{session.coolDown.note}</p>}
          {coolDown.length > 0 && <ItemList view={view} items={coolDown} />}
        </RoutineLine>
      )}
      <SwapsList view={view} session={session} />
    </section>
  );
}

function RoundsLine({ view, segment }: { view: ProgramView; segment: RoundsSegment }) {
  const restBetweenRounds = segment.restBetweenRoundsSeconds > 0 ? ` · ${segment.restBetweenRoundsSeconds} s rest between rounds` : '';
  const [only] = segment.items;
  if (segment.items.length === 1) {
    const work = `${roundsItemAmount(only)} ${segment.intensity}`;
    const round = segment.easySeconds > 0 ? `(${work} / ${segment.easySeconds} s easy)` : work;
    return (
      <>
        <ExerciseLink exerciseId={only.exerciseId} exercisesById={view.exercisesById} />
        {` · ${segment.rounds} × ${round}${restBetweenRounds}`}
      </>
    );
  }
  const easy = segment.easySeconds > 0 ? ` · ${segment.easySeconds} s easy between exercises` : '';
  return (
    <>
      {`${segment.rounds} rounds: `}
      {segment.items.map((item, index) => (
        <Fragment key={item.id}>
          {index > 0 && ', '}
          <ExerciseLink exerciseId={item.exerciseId} exercisesById={view.exercisesById} />
          {` ${roundsItemAmount(item)}`}
        </Fragment>
      ))}
      {`${easy}${restBetweenRounds}`}
    </>
  );
}

function SegmentLine({ view, segment }: { view: ProgramView; segment: CardioSegment }) {
  if (segment.kind === 'rounds') return <RoundsLine view={view} segment={segment} />;
  return (
    <>
      <ExerciseLink exerciseId={segment.exerciseId} exercisesById={view.exercisesById} />
      {` · ${segment.minutes} min · ${CARDIO_INTENSITY_TEXT[segment.intensity]}`}
    </>
  );
}

function CardioCard({ view, cardio }: { view: ProgramView; cardio: CardioSession }) {
  const [only] = cardio.segments;
  return (
    <section aria-label={cardio.name} data-print-keep className="space-y-document-tight">
      <CardHeader title={cardio.name} minutes={cardioMinutes(cardio)} rule="border-training-recovery" level={3} />
      {cardio.segments.length === 1 ? (
        <p className="text-document-table">
          <SegmentLine view={view} segment={only} />
        </p>
      ) : (
        <ol className="list-decimal space-y-1 pl-5 text-document-table marker:font-semibold marker:text-text-secondary">
          {cardio.segments.map(segment => (
            <li key={segment.id} className="pl-1">
              <SegmentLine view={view} segment={segment} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function CardioSection({ view, block }: { view: ProgramView; block: Block }) {
  if (block.cardioSessions.length === 0) return null;
  return (
    <Section title="Cardio">
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
  return <TextSection view={view} target={guide('steps')} fallbackTitle="Daily steps" fill={fill} />;
}

function WhatChanged({ view }: { view: ProgramView }) {
  const shows = useShowsText(view, WHAT_CHANGED);
  const headingId = useId();
  const { number } = view.version;
  if (number <= 1 || !shows) return null;
  return (
    <Section title={`What changed in v${number}`} print="keep" headingId={headingId}>
      <DocumentTextSlot view={view} target={WHAT_CHANGED} labelledBy={headingId}>
        {value => <ParagraphsOf text={value} />}
      </DocumentTextSlot>
    </Section>
  );
}

export type DocumentPart = 'whole' | 'program-wide' | 'block';

type ProgramDocumentProps = { view: ProgramView; editing?: DocumentEditing; part?: DocumentPart };

export function ProgramDocument({ view, editing, part = 'whole' }: ProgramDocumentProps) {
  return (
    <DocumentEditingProvider editing={editing ?? null} typography={EDITED_TEXT_TYPOGRAPHY} topLevel={editing && part !== 'block' ? 2 : 1}>
      <DocumentPages view={view} part={part} />
    </DocumentEditingProvider>
  );
}

function DocumentPages({ view, part }: { view: ProgramView; part: DocumentPart }) {
  const editing = useDocumentEditing();
  const block = currentBlock(view);
  const showsProgramWide = part !== 'block';
  const blockShown = part !== 'program-wide' ? block : null;

  return (
    <article
      data-parity-root="ProgramDocument"
      data-program-document
      aria-label={`${view.clientName} program`}
      className={cn(
        'mx-auto w-full max-w-[210mm] space-y-document-section bg-surface-base px-4 pb-10 text-document-body text-text-primary sm:px-[16mm] sm:pb-[18mm]',
        { 'pt-10 sm:pt-[18mm]': !showsProgramWide, relative: editing !== null },
      )}
    >
      <RunningHeader text={runningHeaderText(view, block)} />
      {showsProgramWide && (
        <>
          <Cover view={view} />
          <WhatChanged view={view} />
          <PlanStrip view={view} />
        </>
      )}
      {blockShown && (
        <Fragment key={blockShown.id}>
          <BlockSection view={view} block={blockShown} />
          <TextSection view={view} target={blockText(blockShown, 'split')} fallbackTitle="Your split" />
          <BlockCalendar view={view} block={blockShown} />
        </Fragment>
      )}
      <div className="space-y-document-section">
        {showsProgramWide && <Legend view={view} />}
        {blockShown && (
          <>
            <EverySession view={view} block={blockShown} />
            <CardioSection view={view} block={blockShown} />
            <StepsSection view={view} block={blockShown} />
          </>
        )}
        {showsProgramWide && (
          <>
            <TextSection view={view} target={guide('lowEnergy')} fallbackTitle="Low-energy session" />
            <TextSection view={view} target={NUTRITION} fallbackTitle="Nutrition" />
            <TextSection view={view} target={LIFESTYLE} fallbackTitle="Lifestyle" />
            <footer data-print-hidden className={cn(DOCUMENT_NOTE_CLASS, 'border-t border-divider pt-document-tight')}>
              {DISCLAIMER_TEXT}
            </footer>
          </>
        )}
      </div>
      {blockShown &&
        blockShown.sessions.map(session => <SessionCard key={`${blockShown.id}-${session.id}`} view={view} block={blockShown} session={session} />)}
    </article>
  );
}
