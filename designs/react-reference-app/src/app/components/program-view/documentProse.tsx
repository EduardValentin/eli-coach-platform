import { useId, type ReactNode } from 'react';
import type { Block } from '../../domain/program';
import type { GuideTextKey } from '../../domain/programTemplates';
import type { BlockTextKey, ProgramTextTarget } from '../../domain/programTexts';
import { DOCUMENT_CARD_TITLE_CLASS, DOCUMENT_HEAD_CLASS, DOCUMENT_PROSE_CLASS, DOCUMENT_SECTION_TITLE_CLASS } from '../typography';
import { DocumentHeading, useDocumentEditing } from './documentEditing';
import { DocumentTextSlot, OptionalMark } from './DocumentTextSlot';
import { TermProse } from './DocumentTerms';
import { ledBy, withLeadIn } from './leadIns';
import { parseTemplate, TemplateBody, type TemplateParagraph } from './ProgramText';
import type { ProgramView } from './programView';

export const COACH_NAME = 'Eli';

const NOTE_FIGURE_CLASS = 'max-w-measure space-y-document-tight border-l-2 border-brand pl-4';
const LABEL_FOCUS_TARGET = -1;

export function guide(key: GuideTextKey): ProgramTextTarget {
  return { kind: 'guide', key };
}

export function blockText(block: Block, key: BlockTextKey): ProgramTextTarget {
  return { kind: 'block', blockId: block.id, key };
}

export function Prose({ paragraphs }: { paragraphs: readonly TemplateParagraph[] }) {
  return <TemplateBody paragraphs={paragraphs} className={DOCUMENT_PROSE_CLASS} />;
}

export function TitledProse({ text, level }: { text: string; level: 2 | 3 }) {
  const { title, paragraphs } = parseTemplate(text);
  if (!title) return <TermProse paragraphs={withLeadIn(paragraphs)} />;
  return (
    <>
      <DocumentHeading level={level} className={level === 2 ? DOCUMENT_SECTION_TITLE_CLASS : DOCUMENT_CARD_TITLE_CLASS}>
        {title}
      </DocumentHeading>
      <TermProse paragraphs={paragraphs} />
    </>
  );
}

/** A coach text with no heading of its own still stands as a labelled row, so its title or opening clause becomes the label. */
export function LedProse({ text }: { text: string }) {
  const { title, paragraphs } = parseTemplate(text);
  return <TermProse paragraphs={title ? ledBy(title, paragraphs) : withLeadIn(paragraphs)} />;
}

type NoteFromCoachProps = { view: ProgramView; target: ProgramTextTarget; children?: ReactNode };

export function NoteFromCoach({ view, target, children }: NoteFromCoachProps) {
  const captionId = useId();
  const editing = useDocumentEditing();
  return (
    <figure data-print-keep className={NOTE_FIGURE_CLASS}>
      <figcaption id={captionId} tabIndex={editing ? LABEL_FOCUS_TARGET : undefined} className={DOCUMENT_HEAD_CLASS}>
        {`A note from ${COACH_NAME}`}
        <OptionalMark view={view} target={target} />
      </figcaption>
      <DocumentTextSlot view={view} target={target} labelledBy={captionId}>
        {value => <Prose paragraphs={parseTemplate(value).paragraphs} />}
      </DocumentTextSlot>
      {children}
    </figure>
  );
}
