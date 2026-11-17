import { format } from 'date-fns';
import type { ProgramTextTarget } from '../../domain/programTexts';
import { DOCUMENT_EYEBROW_CLASS, DOCUMENT_META_CLASS, DOCUMENT_TITLE_CLASS } from '../typography';
import { DocumentHeading } from './documentEditing';
import { COACH_NAME, NoteFromCoach, Prose } from './documentProse';
import { DocumentTextSlot, useShowsText, type SlotLabel } from './DocumentTextSlot';
import { ledBy } from './leadIns';
import { parseTemplate } from './ProgramText';
import { WHAT_CHANGED_LEAD, type ProgramView } from './programView';

const FOCUS_CLASS = 'max-w-measure font-serif text-document-card italic lining-nums text-text-primary';

const TITLE: ProgramTextTarget = { kind: 'version', key: 'title' };
const TITLE_LABEL: SlotLabel = { text: 'Program title', level: 1 };
const FOCUS: ProgramTextTarget = { kind: 'version', key: 'focus' };
const PERSONAL_NOTE: ProgramTextTarget = { kind: 'version', key: 'personalNote' };
const WHAT_CHANGED: ProgramTextTarget = { kind: 'version', key: 'whatChanged' };

function fallbackTitle(view: ProgramView): string {
  const [firstName] = view.clientName.trim().split(/\s+/);
  return firstName ? `${firstName}'s training program` : 'Your training program';
}

function CoverTitle({ view }: { view: ProgramView }) {
  const heading = (text: string) => (
    <DocumentHeading level={1} className={DOCUMENT_TITLE_CLASS}>
      {text}
    </DocumentHeading>
  );
  return (
    <DocumentTextSlot
      view={view}
      target={TITLE}
      label={TITLE_LABEL}
      typography={{ body: DOCUMENT_TITLE_CLASS }}
      placeholder={fallbackTitle(view)}
      unwritten={heading(fallbackTitle(view))}
    >
      {heading}
    </DocumentTextSlot>
  );
}

export function DocumentCover({ view }: { view: ProgramView }) {
  const { version } = view;
  const published = version.publishedAt ? `published ${format(version.publishedAt, 'd MMMM yyyy')}` : 'draft';
  const showsNote = useShowsText(view, PERSONAL_NOTE);
  const showsChange = useShowsText(view, WHAT_CHANGED) && version.number > 1;
  return (
    <header data-print-keep className="relative space-y-document-gap pt-[7mm] print:pt-[5mm]">
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-brand" />
      <div className="space-y-document-tight">
        <p className={DOCUMENT_EYEBROW_CLASS}>{`Training program · Version ${version.number}`}</p>
        <CoverTitle view={view} />
        <p className={DOCUMENT_META_CLASS}>{`From Coach ${COACH_NAME} · ${published}`}</p>
      </div>
      <DocumentTextSlot view={view} target={FOCUS} typography={{ body: FOCUS_CLASS }}>
        {value => <p className={FOCUS_CLASS}>{value}</p>}
      </DocumentTextSlot>
      {(showsNote || showsChange) && (
        <NoteFromCoach view={view} target={PERSONAL_NOTE}>
          {showsChange && (
            <DocumentTextSlot view={view} target={WHAT_CHANGED}>
              {value => <Prose paragraphs={ledBy(WHAT_CHANGED_LEAD, parseTemplate(value).paragraphs)} />}
            </DocumentTextSlot>
          )}
        </NoteFromCoach>
      )}
    </header>
  );
}
