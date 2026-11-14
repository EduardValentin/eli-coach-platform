import { format } from 'date-fns';
import { Fragment, type ReactNode } from 'react';
import { BLOCK_TYPE_LABELS, type Block, type CardioSegment, type CardioSession, type RoundsSegment, type Session } from '../../domain/program';
import { blockDates, nextCheckpoint } from '../../domain/programCalendar';
import { cardioMinutes, roundsItemAmount, SEGMENT_KIND_LABELS } from '../../domain/programCardio';
import { fillTemplate, type GuideTextKey } from '../../domain/programTemplates';
import { printedTitle, programText, type BlockTextKey, type ProgramTextTarget } from '../../domain/programTexts';
import { estimatedMinutes } from '../../domain/sessionTiming';
import { counted } from '../../utils/counted';
import { formatJourneyDate } from '../../utils/journeyLabels';
import {
  DOCUMENT_CARD_TITLE_CLASS,
  DOCUMENT_LABEL_CLASS,
  DOCUMENT_NOTE_CLASS,
  DOCUMENT_PROSE_CLASS,
  DOCUMENT_SECTION_TITLE_CLASS,
  DOCUMENT_VALUE_CLASS,
} from '../typography';
import { cn } from '../ui/utils';
import { BlockCalendar } from './BlockCalendar';
import { BLOCK_RULE, BLOCK_SWATCH } from './blockColours';
import { DocumentEditingProvider, DocumentHeading, type DocumentEditing } from './documentEditing';
import { DocumentTextSlot, useShowsText } from './DocumentTextSlot';
import { Emphasised, parseTemplate, TemplateBody, type TemplateParagraph } from './ProgramText';
import { SessionTable } from './SessionTable';
import { cardioSegmentText, coolDownLines, currentBlock, exerciseName, warmUpLines, type ProgramView } from './programView';

const COACH_NAME = 'Eli';
const DISCLAIMER_TEXT = "Your coach's full disclaimer accompanies this program.";
const LIST_DASH = /^—\s*/;
const SHORT_DATE = 'd MMM';

const BOX_CLASS = 'rounded-field border border-divider p-document-gap';
const NOTE_FIGURE_CLASS = 'max-w-measure space-y-document-tight border-l-2 border-text-primary pl-4';
const FOCUS_CLASS = 'max-w-measure font-serif text-document-card italic text-text-primary';
const EDITED_TEXT_TYPOGRAPHY = { body: DOCUMENT_PROSE_CLASS, heading: DOCUMENT_SECTION_TITLE_CLASS };

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
  return <TemplateBody paragraphs={paragraphs} className={DOCUMENT_PROSE_CLASS} />;
}

type SectionProps = { title: string; children: ReactNode; print?: 'keep' | 'new-page' };

function Section({ title, children, print }: SectionProps) {
  return (
    <section
      aria-label={title}
      data-print-keep={print === 'keep' ? '' : undefined}
      data-print-new-page={print === 'new-page' ? '' : undefined}
      className="space-y-document-gap"
    >
      <DocumentHeading level={2} className={DOCUMENT_SECTION_TITLE_CLASS}>
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
      <DocumentTextSlot view={view} target={target} className="space-y-document-gap">
        {value => <TitledProse text={fill(value)} fallbackTitle={fallbackTitle} />}
      </DocumentTextSlot>
    </section>
  );
}

function RunningHeader({ text }: { text: string }) {
  return <style>{`@media print { @page { @top-left { content: ${JSON.stringify(text)}; } } }`}</style>;
}

function NoteFromCoach({ view, target }: { view: ProgramView; target: ProgramTextTarget }) {
  return (
    <figure data-print-keep className={NOTE_FIGURE_CLASS}>
      <figcaption className={DOCUMENT_LABEL_CLASS}>{`A note from ${COACH_NAME}`}</figcaption>
      <DocumentTextSlot view={view} target={target}>
        {value => <ParagraphsOf text={value} />}
      </DocumentTextSlot>
    </figure>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className={DOCUMENT_LABEL_CLASS}>{label}</dt>
      <dd className={cn(DOCUMENT_VALUE_CLASS, 'text-document-body')}>{children}</dd>
    </div>
  );
}

function Facts({ view, block }: { view: ProgramView; block: Block }) {
  return (
    <dl className="mt-document-gap grid gap-x-6 gap-y-document-tight border-t border-divider pt-document-gap sm:grid-cols-3">
      <Fact label="Now">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className={cn('size-2.5 shrink-0 rounded-full', BLOCK_SWATCH[block.type])} />
          {nowReading(view, block)}
        </span>
      </Fact>
      <Fact label="Next check-in form">{nextCheckInReading(view)}</Fact>
      <Fact label="Daily steps">{block.dailySteps.toLocaleString('en-US')}</Fact>
    </dl>
  );
}

function Cover({ view, block }: { view: ProgramView; block: Block | null }) {
  const { version } = view;
  const date = version.publishedAt ? format(version.publishedAt, 'd MMMM yyyy') : 'Draft';
  const showsNote = useShowsText(view, PERSONAL_NOTE);
  return (
    <header data-print-keep className="relative -mx-4 overflow-hidden bg-surface-subtle px-4 pt-7 pb-6 sm:-mx-[16mm] sm:px-[16mm]">
      {block && <span aria-hidden="true" className={cn('absolute inset-x-0 top-0 h-1.5', BLOCK_SWATCH[block.type])} />}
      <DocumentTextSlot
        view={view}
        target={TITLE}
        typography={{ body: DOCUMENT_LABEL_CLASS }}
        unwritten={<p className={DOCUMENT_LABEL_CLASS}>{printedTitle(version.content)}</p>}
      >
        {value => <p className={DOCUMENT_LABEL_CLASS}>{value}</p>}
      </DocumentTextSlot>
      <DocumentHeading level={1} className="mt-document-tight font-serif text-document-title font-semibold text-text-primary">
        {view.clientName}
      </DocumentHeading>
      <p className="mt-document-tight text-document-body text-text-secondary">{`Version ${version.number} · ${date} · Coach ${COACH_NAME}`}</p>
      {block && <Facts view={view} block={block} />}
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

function PlanStrip({ view }: { view: ProgramView }) {
  const { blocks } = view.version.content.plan;
  const { dayOne, position } = view;
  return (
    <ol className="flex gap-1 max-sm:flex-col max-sm:gap-document-gap">
      {blocks.map((block, index) => {
        const dates = dayOne ? blockDates(blocks, index, dayOne) : null;
        const isCurrent = position.status === 'in-plan' && position.blockIndex === index;
        return (
          <li
            key={block.id}
            aria-current={isCurrent ? 'true' : undefined}
            style={{ flexGrow: block.weeks, flexBasis: 0 }}
            className={cn('relative flex flex-col gap-0.5 max-sm:pl-3.5 sm:min-w-28', DOCUMENT_NOTE_CLASS)}
          >
            <span
              aria-hidden="true"
              className={cn('mb-1 h-1.5 rounded-full max-sm:absolute max-sm:inset-y-0 max-sm:left-0 max-sm:mb-0 max-sm:h-auto max-sm:w-1.5', BLOCK_SWATCH[block.type])}
            />
            <span className="text-document-body font-semibold text-text-primary">
              {BLOCK_TYPE_LABELS[block.type]}
              {isCurrent && <span className="font-normal text-text-secondary"> · now</span>}
            </span>
            <span className="tabular-nums">
              {counted(block.weeks, 'week')}
              {dates && ` · ${format(dates.start, SHORT_DATE)} – ${format(dates.end, SHORT_DATE)}`}
            </span>
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
      <DocumentTextSlot view={view} target={LEGEND} className="space-y-document-tight" typography={{ heading: DOCUMENT_CARD_TITLE_CLASS }}>
        {value => <LegendBody text={value} />}
      </DocumentTextSlot>
    </aside>
  );
}

function LegendBody({ text }: { text: string }) {
  const { title, paragraphs } = parseTemplate(text);
  return (
    <>
      <DocumentHeading level={2} className={DOCUMENT_CARD_TITLE_CLASS}>
        {title || LEGEND_FALLBACK_TITLE}
      </DocumentHeading>
      <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-document-table max-sm:gap-y-0 sm:grid-cols-[max-content_1fr] max-sm:[&>div+div>dt]:mt-2">
        {paragraphs.map(paragraph => {
          const term = paragraph.lead?.replace(/:$/, '') ?? '';
          const description = paragraph.body.replace(LIST_DASH, '');
          return (
            <div key={`${term}${description}`} className="contents">
              <dt className={DOCUMENT_VALUE_CLASS}>{term}</dt>
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
    <section aria-label={title} data-print-new-page className="space-y-document-gap">
      <div className="space-y-document-tight">
        <span aria-hidden="true" className={cn('block h-1.5 rounded-full', BLOCK_SWATCH[block.type])} />
        <p className={DOCUMENT_LABEL_CLASS}>{blockLabel(view, block)}</p>
        <DocumentTextSlot
          view={view}
          target={intro}
          className="space-y-document-gap"
          unwritten={
            <DocumentHeading level={2} className={DOCUMENT_SECTION_TITLE_CLASS}>
              {fallbackTitle}
            </DocumentHeading>
          }
        >
          {value => <TitledProse text={value} fallbackTitle={fallbackTitle} />}
        </DocumentTextSlot>
      </div>
      {showsNote && <NoteFromCoach view={view} target={note} />}
      {block.calibrationWeek && (
        <DocumentTextSlot view={view} target={guide('calibration')}>
          {value => <ParagraphsOf text={value} />}
        </DocumentTextSlot>
      )}
    </section>
  );
}

function SubHeading({ children }: { children: ReactNode }) {
  return (
    <DocumentHeading level={4} className={cn(DOCUMENT_LABEL_CLASS, 'shrink-0')}>
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
      <DocumentHeading level={3} className={DOCUMENT_CARD_TITLE_CLASS}>
        Every session
      </DocumentHeading>
      <DocumentTextSlot view={view} target={guide('warmUp')} className="space-y-document-tight" typography={{ heading: DOCUMENT_LABEL_CLASS }}>
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
      <DocumentTextSlot view={view} target={guide('noWeight')} typography={{ body: DOCUMENT_NOTE_CLASS }}>
        {value => <p className={DOCUMENT_NOTE_CLASS}>{value}</p>}
      </DocumentTextSlot>
    </div>
  );
}

type CardHeaderProps = { title: string; minutes: number; rule: string };

function CardHeader({ title, minutes, rule }: CardHeaderProps) {
  return (
    <div className={cn('flex items-baseline justify-between gap-4 border-b-2 pb-1.5', rule)}>
      <DocumentHeading level={3} className={DOCUMENT_CARD_TITLE_CLASS}>
        {title}
      </DocumentHeading>
      <p className="text-document-table whitespace-nowrap text-text-secondary">
        About <span className={DOCUMENT_VALUE_CLASS}>{`${minutes} min`}</span>
      </p>
    </div>
  );
}

function ItemList({ lines }: { lines: readonly string[] }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-0.5 text-document-table text-text-primary">
      {lines.map(line => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );
}

function RoutineLine({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline gap-x-4 gap-y-0.5 max-sm:flex-col">
      <SubHeading>{title}</SubHeading>
      <div className="min-w-0 space-y-0.5">{children}</div>
    </div>
  );
}

type SessionCardProps = { view: ProgramView; block: Block; session: Session };

function SessionCard({ view, block, session }: SessionCardProps) {
  const warmUp = warmUpLines(session, view.exercisesById);
  const coolDown = coolDownLines(session, view.exercisesById);
  return (
    <section aria-label={session.name} data-print-card className="space-y-document-tight">
      <div data-print-heading className="space-y-document-tight">
        <CardHeader title={session.name} minutes={estimatedMinutes(session, view.exercisesById)} rule={BLOCK_RULE[block.type]} />
        {warmUp.length > 0 && (
          <RoutineLine title="Warm-up">
            <ItemList lines={warmUp} />
          </RoutineLine>
        )}
      </div>
      <SessionTable session={session} block={block} exercisesById={view.exercisesById} />
      {session.coolDown.enabled && (
        <RoutineLine title="Cool-down">
          {session.coolDown.note && <p className="max-w-measure text-document-table text-text-primary">{session.coolDown.note}</p>}
          {coolDown.length > 0 && <ItemList lines={coolDown} />}
        </RoutineLine>
      )}
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
      <CardHeader title={cardio.name} minutes={cardioMinutes(cardio)} rule="border-training-recovery" />
      <ol className="list-decimal space-y-document-tight pl-5 text-document-table marker:font-semibold marker:text-training-recovery">
        {cardio.segments.map(segment => (
          <SegmentItem key={segment.id} view={view} segment={segment} />
        ))}
      </ol>
    </section>
  );
}

function SessionsSection({ view, block }: { view: ProgramView; block: Block }) {
  return (
    <Section title="Your sessions">
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
    <Section title="Your cardio" print="new-page">
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
  const { number } = view.version;
  if (number <= 1 || !shows) return null;
  return (
    <Section title={`What changed in v${number}`} print="keep">
      <DocumentTextSlot view={view} target={WHAT_CHANGED}>
        {value => <ParagraphsOf text={value} />}
      </DocumentTextSlot>
    </Section>
  );
}

export type DocumentPart = 'whole' | 'program-wide' | 'block';

type ProgramDocumentProps = { view: ProgramView; editing?: DocumentEditing; part?: DocumentPart };

export function ProgramDocument({ view, editing, part = 'whole' }: ProgramDocumentProps) {
  return (
    <DocumentEditingProvider editing={editing ?? null} typography={EDITED_TEXT_TYPOGRAPHY}>
      <DocumentPages view={view} part={part} />
    </DocumentEditingProvider>
  );
}

function DocumentPages({ view, part }: { view: ProgramView; part: DocumentPart }) {
  const { version } = view;
  const block = currentBlock(view);
  const showsProgramWide = part !== 'block';
  const showsBlock = part !== 'program-wide';

  return (
    <article
      data-parity-root="ProgramDocument"
      data-program-document
      aria-label={`${view.clientName} program`}
      className={cn(
        'mx-auto w-full max-w-[210mm] space-y-document-section bg-surface-base px-4 pb-10 text-document-body text-text-primary sm:px-[16mm] sm:pb-[18mm]',
        { 'pt-10 sm:pt-[18mm]': !showsProgramWide },
      )}
    >
      <RunningHeader text={`${view.clientName} · Program v${version.number}`} />
      {showsProgramWide && (
        <>
          <Cover view={view} block={block} />
          <WhatChanged view={view} />
          <Section title="Your plan" print="keep">
            <PlanStrip view={view} />
          </Section>
          <Legend view={view} />
        </>
      )}
      {showsBlock && block && (
        <Fragment key={block.id}>
          <BlockSection view={view} block={block} />
          <TextSection view={view} target={blockText(block, 'split')} fallbackTitle="Your split" />
          <BlockCalendar view={view} block={block} />
          <SessionsSection view={view} block={block} />
          <CardioSection view={view} block={block} />
          <StepsSection view={view} block={block} />
        </Fragment>
      )}
      {showsProgramWide && (
        <>
          <TextSection view={view} target={guide('lowEnergy')} fallbackTitle="Low-energy session" />
          <TextSection view={view} target={NUTRITION} fallbackTitle="Nutrition" />
          <TextSection view={view} target={LIFESTYLE} fallbackTitle="Lifestyle" />
          <footer data-print-keep className={cn(DOCUMENT_NOTE_CLASS, 'border-t border-divider pt-document-tight')}>
            <span className="font-semibold text-text-primary">Disclaimer. </span>
            {DISCLAIMER_TEXT}
          </footer>
        </>
      )}
    </article>
  );
}
