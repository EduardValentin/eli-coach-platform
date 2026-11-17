import type { ReactNode } from 'react';
import { DOCUMENT_PROSE_CLASS, DOCUMENT_TERM_CLASS } from '../typography';
import { cn } from '../ui/utils';
import { termRowOf, type TermRow } from './leadIns';
import { TemplateBody, type TemplateParagraph } from './ProgramText';

const EDITED_ROWS_CLASS = cn(
  'max-sm:[&>p>strong:first-child]:block sm:[&>p:has(>strong:first-child)]:grid sm:[&>p>:not(:first-child)]:col-start-2',
  'sm:[&>p]:grid-cols-[var(--document-term-column)_minmax(0,1fr)] sm:[&>p]:gap-x-(--document-term-gap)',
);

/** The coach edits these texts as paragraphs, so a bold lead-in takes the term column while she types, as it will in print. */
export const EDITED_TERM_ROWS_CLASS = cn(DOCUMENT_PROSE_CLASS, EDITED_ROWS_CLASS);

export function TermList({ children }: { children: ReactNode }) {
  return (
    <dl className="grid items-baseline text-document-body leading-document-prose sm:grid-cols-[var(--document-term-column)_minmax(0,1fr)] sm:gap-x-(--document-term-gap) sm:gap-y-document-gap">
      {children}
    </dl>
  );
}

export function Term({ term, children }: { term: ReactNode; children: ReactNode }) {
  return (
    <>
      <dt className={cn(DOCUMENT_TERM_CLASS, 'leading-document-prose max-sm:mt-document-gap max-sm:first:mt-0')}>{term}</dt>
      <dd className="max-w-prose-measure text-text-primary">{children}</dd>
    </>
  );
}

function termRowsOf(paragraphs: readonly TemplateParagraph[]): { opening: TemplateParagraph[]; rows: TermRow[] } {
  const opening: TemplateParagraph[] = [];
  const rows: TermRow[] = [];
  for (const paragraph of paragraphs) {
    if (paragraph.lead !== undefined) rows.push(termRowOf(paragraph.lead, paragraph.body));
    else (rows.at(-1)?.paragraphs ?? opening).push(paragraph);
  }
  return { opening, rows };
}

/** Paragraphs before the first lead-in have no term to stand beside, so they stay prose above the rows. */
export function TermProse({ paragraphs }: { paragraphs: readonly TemplateParagraph[] }) {
  const { opening, rows } = termRowsOf(paragraphs);
  return (
    <div className="space-y-document-gap">
      {opening.length > 0 && <TemplateBody paragraphs={opening} className={DOCUMENT_PROSE_CLASS} />}
      {rows.length > 0 && (
        <TermList>
          {rows.map(row => (
            <Term key={row.term} term={row.term}>
              <TemplateBody paragraphs={row.paragraphs} className={DOCUMENT_PROSE_CLASS} />
            </Term>
          ))}
        </TermList>
      )}
    </div>
  );
}
