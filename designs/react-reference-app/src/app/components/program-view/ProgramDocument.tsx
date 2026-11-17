import { blockSpan } from '../../domain/programCalendar';
import type { ProgramTextTarget } from '../../domain/programTexts';
import { DOCUMENT_NOTE_CLASS, DOCUMENT_PROSE_CLASS, DOCUMENT_SECTION_TITLE_CLASS } from '../typography';
import { cn } from '../ui/utils';
import { BlockOpener } from './BlockOpener';
import { CardioDayPage } from './CardioDayPage';
import { DocumentCover } from './DocumentCover';
import { DocumentEditingProvider, DocumentHeading, useDocumentEditing, type DocumentEditing } from './documentEditing';
import { TitledProse } from './documentProse';
import { DocumentReadingGuide } from './DocumentReadingGuide';
import { DocumentTextSlot, useShowsText } from './DocumentTextSlot';
import { firstWeekOfBlock, GLANCE_ANCHOR, isCardioDay, publicationWeek, strengthDayOf, trainingDays, weekAnchor, weeksOfBlock } from './documentWeeks';
import { PlanTimeline, type TimelineWeekAction } from './PlanTimeline';
import { parseTemplate } from './ProgramText';
import { blocksOf, currentBlock, type ProgramView } from './programView';
import { StrengthDayPage } from './StrengthDayPage';
import { WeekOverviewPage } from './WeekOverviewPage';
import { weekSpanText, type WeekView } from './weekView';

/** An A4 sheet's width; the printed page's own size and margins live in `print.css`'s `@page`, which cannot read a variable. */
export const DOCUMENT_SHEET_WIDTH_CLASS = 'max-w-[210mm]';

const EDITED_TEXT_TYPOGRAPHY = { body: DOCUMENT_PROSE_CLASS, heading: DOCUMENT_SECTION_TITLE_CLASS };
const NUTRITION: ProgramTextTarget = { kind: 'version', key: 'nutrition' };
const LIFESTYLE: ProgramTextTarget = { kind: 'version', key: 'lifestyle' };
const CSS_STRING_SAFE = /[\p{L}\p{N} .,'-]/u;

type DocumentPart = 'whole' | 'program-wide' | 'block';

type Chapter = { index: number; weeks: WeekView[] };

function chaptersOf(view: ProgramView, part: DocumentPart): Chapter[] {
  const blocks = blocksOf(view);
  if (part === 'program-wide') return [];
  if (part === 'block') {
    const block = currentBlock(view);
    const index = block ? blocks.indexOf(block) : -1;
    return index === -1 ? [] : [{ index, weeks: [firstWeekOfBlock(view, index)] }];
  }
  const from = publicationWeek(view);
  return blocks.map((_, index) => ({ index, weeks: weeksOfBlock(view, index, from) })).filter(chapter => chapter.weeks.length > 0);
}

type WeekPagesProps = { view: ProgramView; week: WeekView; blockFirst: WeekView };

function WeekPages({ view, week, blockFirst }: WeekPagesProps) {
  const repeat = blockFirst.weekOfPlan !== week.weekOfPlan;
  return (
    <div className="space-y-document-section">
      <WeekOverviewPage view={view} week={week} />
      {trainingDays(week).map(day => {
        if (isCardioDay(day)) return <CardioDayPage key={day.weekday} view={view} week={week} day={day} />;
        const first = repeat ? strengthDayOf(blockFirst, day.weekday) : undefined;
        return <StrengthDayPage key={day.weekday} view={view} week={week} day={day} sameSetsAs={first ? { week: blockFirst, day: first } : null} />;
      })}
    </div>
  );
}

function RepeatedWeeksNote({ view, index }: { view: ProgramView; index: number }) {
  const { startWeek, endWeek } = blockSpan(blocksOf(view), index);
  if (endWeek === startWeek) return null;
  const repeated = weekSpanText(startWeek + 1, endWeek);
  const text = endWeek === startWeek + 1 ? `${repeated} prints the same pages with its own dates.` : `${repeated} print the same pages with their own dates.`;
  return <p className={cn(DOCUMENT_NOTE_CLASS, 'border-t border-border-subtle pt-document-gap')}>{text}</p>;
}

function BlockChapter({ view, chapter }: { view: ProgramView; chapter: Chapter }) {
  const editing = useDocumentEditing();
  const [blockFirst] = chapter.weeks;
  return (
    <div className="space-y-document-section">
      <BlockOpener view={view} index={chapter.index} />
      {chapter.weeks.map(week => (
        <WeekPages key={week.weekOfPlan} view={view} week={week} blockFirst={blockFirst} />
      ))}
      {editing && <RepeatedWeeksNote view={view} index={chapter.index} />}
    </div>
  );
}

function AtAGlance({ view, weekAction }: { view: ProgramView; weekAction: Extract<TimelineWeekAction, { kind: 'anchor' | 'none' }> }) {
  const headingId = `${GLANCE_ANCHOR}-heading`;
  return (
    <section id={GLANCE_ANCHOR} aria-labelledby={headingId} data-print-keep className="space-y-document-gap">
      <DocumentHeading id={headingId} level={2} className={DOCUMENT_SECTION_TITLE_CLASS}>
        Your program at a glance
      </DocumentHeading>
      <PlanTimeline blocks={blocksOf(view)} dayOne={view.dayOne} today={view.today} preferredWeekday={view.preferredWeekday} weekAction={weekAction} />
    </section>
  );
}

function ClosingSection({ view, target, title }: { view: ProgramView; target: ProgramTextTarget; title: string }) {
  if (!useShowsText(view, target)) return null;
  return (
    <section aria-label={title} data-print-keep>
      <DocumentTextSlot view={view} target={target} label={{ text: title, level: 2, className: DOCUMENT_SECTION_TITLE_CLASS }} className="space-y-document-gap">
        {value => <TitledProse text={parseTemplate(value).title ? value : `**${title}**\n${value}`} level={2} />}
      </DocumentTextSlot>
    </section>
  );
}

function Closing({ view }: { view: ProgramView }) {
  const showsNutrition = useShowsText(view, NUTRITION);
  const showsLifestyle = useShowsText(view, LIFESTYLE);
  if (!showsNutrition && !showsLifestyle) return null;
  return (
    <div data-print-page className="space-y-document-section">
      <ClosingSection view={view} target={NUTRITION} title="Nutrition" />
      <ClosingSection view={view} target={LIFESTYLE} title="Lifestyle" />
    </div>
  );
}

/** Every character outside a plain name is a CSS hex escape, so no name can close the CSS string or the `<style>` element. */
function cssString(text: string): string {
  const escaped = Array.from(text, character => (CSS_STRING_SAFE.test(character) ? character : `\\${character.codePointAt(0)?.toString(16)} `));
  return `"${escaped.join('')}"`;
}

function runningHeaderCss(view: ProgramView): string {
  return `@media print { @page { @top-left { content: ${cssString(view.clientName)}; } } @page :first { @top-left { content: none; } } }`;
}

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
  const showsProgramWide = part !== 'block';
  const chapters = chaptersOf(view, part);
  const printed = new Set(chapters.flatMap(chapter => chapter.weeks).map(week => week.weekOfPlan));
  return (
    <article
      data-parity-root="ProgramDocument"
      data-program-document
      aria-label={`${view.clientName} program`}
      className={cn(
        'mx-auto w-full space-y-document-section bg-surface-base px-4 pb-10 text-document-body text-text-primary sm:px-[16mm] sm:pb-[18mm]',
        DOCUMENT_SHEET_WIDTH_CLASS,
        { 'pt-10 sm:pt-[18mm]': !showsProgramWide, 'pt-6 sm:pt-[12mm]': showsProgramWide, relative: editing !== null },
      )}
    >
      {/* Set as markup because React escapes a style's text when rendered on a server, which would turn the string's quotes into &quot;. */}
      <style dangerouslySetInnerHTML={{ __html: runningHeaderCss(view) }} />
      {showsProgramWide && (
        <>
          <DocumentCover view={view} />
          <AtAGlance
            view={view}
            weekAction={part === 'whole' ? { kind: 'anchor', hrefOf: week => (printed.has(week) ? `#${weekAnchor(week)}` : null) } : { kind: 'none' }}
          />
          <DocumentReadingGuide view={view} />
        </>
      )}
      {chapters.map(chapter => (
        <BlockChapter key={chapter.index} view={view} chapter={chapter} />
      ))}
      {showsProgramWide && <Closing view={view} />}
    </article>
  );
}
