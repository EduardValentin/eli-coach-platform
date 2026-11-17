import { useId } from 'react';
import type { Block } from '../../domain/program';
import { blockDates, blockSpan } from '../../domain/programCalendar';
import { DOCUMENT_CARD_TITLE_CLASS, DOCUMENT_CHAPTER_TITLE_CLASS, DOCUMENT_META_CLASS } from '../typography';
import { cn } from '../ui/utils';
import { BLOCK_RULE } from './blockColours';
import { BlockNumber } from './BlockNumber';
import { DocumentHeading } from './documentEditing';
import { blockText, guide, LedProse, NoteFromCoach, TitledProse } from './documentProse';
import { EDITED_TERM_ROWS_CLASS } from './DocumentTerms';
import { DocumentTextSlot, useShowsText } from './DocumentTextSlot';
import { blocksOf, dateRangeText, type ProgramView } from './programView';
import { blockName, weekSpanText } from './weekView';

function blockMeta(view: ProgramView, index: number): string {
  const blocks = blocksOf(view);
  if (view.dayOne) return dateRangeText(blockDates(blocks, index, view.dayOne));
  const { startWeek, endWeek } = blockSpan(blocks, index);
  return weekSpanText(startWeek, endWeek);
}

const EDITED_INTRO_TYPOGRAPHY = { body: EDITED_TERM_ROWS_CLASS, heading: DOCUMENT_CARD_TITLE_CLASS };
const EDITED_ROW_TYPOGRAPHY = { body: EDITED_TERM_ROWS_CLASS };

function BlockTexts({ view, block }: { view: ProgramView; block: Block }) {
  const showsNote = useShowsText(view, blockText(block, 'note'));
  return (
    <div className={cn('space-y-document-gap border-t-2 pt-document-gap', BLOCK_RULE[block.type])}>
      <DocumentTextSlot
        view={view}
        target={blockText(block, 'intro')}
        label={{ text: `${blockName(block)} block`, level: 3, className: DOCUMENT_CARD_TITLE_CLASS }}
        className="space-y-[0.5em]"
        typography={EDITED_INTRO_TYPOGRAPHY}
      >
        {value => <TitledProse text={value} level={3} />}
      </DocumentTextSlot>
      {showsNote && <NoteFromCoach view={view} target={blockText(block, 'note')} />}
      <DocumentTextSlot view={view} target={blockText(block, 'split')} typography={EDITED_ROW_TYPOGRAPHY}>
        {value => <LedProse text={value} />}
      </DocumentTextSlot>
      <DocumentTextSlot view={view} target={blockText(block, 'missedDay')} typography={EDITED_ROW_TYPOGRAPHY}>
        {value => <LedProse text={value} />}
      </DocumentTextSlot>
      <DocumentTextSlot view={view} target={guide('steps')} typography={EDITED_ROW_TYPOGRAPHY}>
        {value => <LedProse text={value} />}
      </DocumentTextSlot>
    </div>
  );
}

export function BlockOpener({ view, index }: { view: ProgramView; index: number }) {
  const block = blocksOf(view)[index];
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} data-print-page className="space-y-document-gap">
      <header data-print-heading>
        <div className={cn(DOCUMENT_CHAPTER_TITLE_CLASS, 'flex items-center gap-[0.35em]')}>
          <BlockNumber block={block} index={index} size="document" />
          <DocumentHeading id={headingId} level={2} className={DOCUMENT_CHAPTER_TITLE_CLASS}>
            {blockName(block)}
          </DocumentHeading>
        </div>
        <p className={cn(DOCUMENT_META_CLASS, 'mt-[0.4em]')}>{blockMeta(view, index)}</p>
      </header>
      <BlockTexts view={view} block={block} />
    </section>
  );
}
