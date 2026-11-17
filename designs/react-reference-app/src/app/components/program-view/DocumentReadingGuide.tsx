import { Fragment, useId } from 'react';
import { planHasCoolDown } from '../../domain/program';
import { cardioIntensitiesOf } from '../../domain/programCardio';
import type { ProgramTextTarget } from '../../domain/programTexts';
import { DOCUMENT_CARD_TITLE_CLASS, DOCUMENT_EYEBROW_CLASS, DOCUMENT_SECTION_TITLE_CLASS, DOCUMENT_TERM_CLASS } from '../typography';
import { cardVariants } from '../ui/card';
import { cn } from '../ui/utils';
import { DocumentHeading, useDocumentEditing } from './documentEditing';
import { guide, LedProse } from './documentProse';
import { EDITED_TERM_ROWS_CLASS, Term, TermList } from './DocumentTerms';
import { DocumentTextSlot } from './DocumentTextSlot';
import { EffortKey } from './EffortKey';
import { leadTerm } from './leadIns';
import { PositionBadge } from './PositionBadge';
import { Emphasised, type TemplateParagraph } from './ProgramText';
import { blocksOf, viewText, type ProgramView } from './programView';
import { NO_WEIGHT_TERM, readingGuide, rirTermRange, WARM_UP_SET_TERM, type ReadingGuide } from './readingGuide';
import { RirValue } from './RirValue';
import { SetMark } from './SetMark';

const TERM_SEPARATOR_MARK = '—';
const LIST_DASH = /^—\s*/;
const TERM_SEPARATOR = /\s*[,/]\s*/;
const MARK_TERM = /^[A-D]\d?$/;
const WARM_UP_SET_LOG_TEXT = 'Log it like the others.';

const TERM_MARK_CLASS = 'ml-[0.45em] inline-flex align-middle';
const EDITED_LEGEND_TYPOGRAPHY = { body: cn(EDITED_TERM_ROWS_CLASS, '[&>h3]:mb-document-tight'), heading: DOCUMENT_CARD_TITLE_CLASS };
const EDITED_TERM_ROW_TYPOGRAPHY = {
  body: cn(
    EDITED_TERM_ROWS_CLASS,
    'sm:[&:has(>h3)]:grid sm:[&:has(>h3)]:grid-cols-[var(--document-term-column)_minmax(0,1fr)] sm:[&:has(>h3)]:gap-x-(--document-term-gap) sm:[&>h3]:row-start-1 sm:[&:has(>h3)>:not(h3)]:col-start-2',
  ),
  heading: DOCUMENT_TERM_CLASS,
};

const LEGEND = guide('legend');
const NO_WEIGHT = guide('noWeight');

function LegendTerm({ term }: { term: string }) {
  const rir = rirTermRange(term);
  if (rir) {
    return (
      <>
        RIR
        <span className={TERM_MARK_CLASS}>
          <RirValue rir={rir} />
        </span>
      </>
    );
  }
  const marks = term.split(TERM_SEPARATOR);
  if (!marks.every(mark => MARK_TERM.test(mark))) return term;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 align-middle">
      {marks.map((mark, index) => (
        <Fragment key={mark}>
          {index > 0 && <span className="sr-only">, </span>}
          <PositionBadge label={mark} size="document" />
        </Fragment>
      ))}
    </span>
  );
}

function LegendTerms({ rows }: { rows: readonly TemplateParagraph[] }) {
  return (
    <TermList>
      {rows.map(paragraph => {
        const term = leadTerm(paragraph);
        const description = paragraph.body.replace(LIST_DASH, '');
        return (
          <Term key={`${term}${description}`} term={<LegendTerm term={term} />}>
            <Emphasised text={description} />
          </Term>
        );
      })}
    </TermList>
  );
}

function MarkTerms({ view, guideRows }: { view: ProgramView; guideRows: ReadingGuide }) {
  const intensities = cardioIntensitiesOf(blocksOf(view).flatMap(block => block.cardioSessions));
  return (
    <TermList>
      {guideRows.noWeight.row === 'own-row' && (
        <Term term={NO_WEIGHT_TERM}>
          <DocumentTextSlot view={view} target={NO_WEIGHT}>
            {value => <p>{value}</p>}
          </DocumentTextSlot>
        </Term>
      )}
      <Term
        term={
          <>
            {WARM_UP_SET_TERM}
            <span aria-hidden="true" className={TERM_MARK_CLASS}>
              <SetMark kind="warm-up" number={1} size="document" />
            </span>
          </>
        }
      >
        {`${guideRows.warmUpSet.body} ${WARM_UP_SET_LOG_TEXT}`}
      </Term>
      {intensities.length > 0 && (
        <Term term="Effort">
          <EffortKey intensities={intensities} layout="term" />
        </Term>
      )}
    </TermList>
  );
}

function EverySessionRow({ view, target }: { view: ProgramView; target: ProgramTextTarget }) {
  return (
    <DocumentTextSlot view={view} target={target} typography={EDITED_TERM_ROW_TYPOGRAPHY} leadSeparator={TERM_SEPARATOR_MARK}>
      {value => <LedProse text={value} />}
    </DocumentTextSlot>
  );
}

export function DocumentReadingGuide({ view }: { view: ProgramView }) {
  const editing = useDocumentEditing();
  const headingId = useId();
  const rows = readingGuide({ legend: viewText(view, LEGEND).value, noWeight: viewText(view, NO_WEIGHT).value }, editing ? 'editing' : 'reading');
  return (
    <section aria-labelledby={headingId} data-print-page data-print-keep className={cn(cardVariants({ variant: 'quiet' }), 'space-y-document-gap p-5 sm:px-[6mm] sm:py-[5mm]')}>
      <DocumentHeading id={headingId} level={2} className={DOCUMENT_SECTION_TITLE_CLASS}>
        How to read your sessions
      </DocumentHeading>
      <div className="space-y-document-gap">
        <DocumentTextSlot view={view} target={LEGEND} typography={EDITED_LEGEND_TYPOGRAPHY} leadSeparator={TERM_SEPARATOR_MARK}>
          {() => <LegendTerms rows={rows.legend} />}
        </DocumentTextSlot>
        <MarkTerms view={view} guideRows={rows} />
      </div>
      <div className="space-y-document-gap border-t border-border-subtle pt-document-gap">
        <p className={DOCUMENT_EYEBROW_CLASS}>Every session</p>
        <EverySessionRow view={view} target={guide('warmUp')} />
        <EverySessionRow view={view} target={guide('progression')} />
        {planHasCoolDown(blocksOf(view)) && <EverySessionRow view={view} target={guide('coolDown')} />}
        <EverySessionRow view={view} target={guide('lowEnergy')} />
      </div>
    </section>
  );
}
