import { Pencil } from 'lucide-react';
import { useEffect, useId, useRef, useState, type FocusEvent, type ReactNode } from 'react';
import { isCustomised, isWritten, programText, type ProgramText, type ProgramTextTarget, type TextFormatting } from '../../domain/programTexts';
import { showUndoToast } from '../../utils/showUndoToast';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { RichTextEditor, type RichTextEditorHandle, type RichTextTheme, type RichTextTool } from '../ui/rich-text-editor';
import { cn } from '../ui/utils';
import { DocumentHeading, useDocumentEditing, useDocumentTypography, type DocumentEditing, type DocumentTypography, type HeadingLevel } from './documentEditing';
import { TEMPLATE_TEXT_CLASSES } from './ProgramText';
import { PROGRAM_TEXT_FORMAT } from './programTextFormat';
import type { ProgramView } from './programView';

export type SlotLabel = { text: string; level?: HeadingLevel; className?: string };

type TextSlotProps = {
  view: ProgramView;
  target: ProgramTextTarget;
  label?: SlotLabel;
  labelledBy?: string;
  className?: string;
  unwritten?: ReactNode;
  typography?: Partial<DocumentTypography>;
  children: (value: string) => ReactNode;
};

const EDIT_BUTTON_CLASS =
  'text-text-secondary sm:absolute sm:right-[calc(8mm-1rem)]';
const EMPTY_LABEL_CLASS = 'text-document-body font-semibold text-text-primary';
const TOOLS: Record<TextFormatting, readonly RichTextTool[]> = {
  plain: [],
  paragraphs: ['bold', 'italic', 'list'],
  titled: ['heading', 'bold', 'italic', 'list'],
};

function textOf(view: ProgramView, target: ProgramTextTarget): ProgramText {
  return programText(view.version, target, view.program.language);
}

export function useShowsText(view: ProgramView, target: ProgramTextTarget): boolean {
  const editing = useDocumentEditing();
  return editing !== null || isWritten(textOf(view, target).value);
}

function OptionalSuffix() {
  return <span className="font-normal"> (optional)</span>;
}

export function OptionalMark({ view, target }: { view: ProgramView; target: ProgramTextTarget }) {
  const editing = useDocumentEditing();
  const text = textOf(view, target);
  if (!editing || !text.optional || isWritten(text.value)) return null;
  return <OptionalSuffix />;
}

function useEditorTheme(override: Partial<DocumentTypography> | undefined): RichTextTheme {
  const typography = { ...useDocumentTypography(), ...override };
  return {
    root: cn(TEMPLATE_TEXT_CLASSES.body, typography.body),
    heading: typography.heading,
    list: TEMPLATE_TEXT_CLASSES.list,
    bold: TEMPLATE_TEXT_CLASSES.lead,
    italic: 'italic',
  };
}

function PendingBadge({ id }: { id?: string }) {
  return (
    <Badge id={id} tone="pending">
      Romanian text pending
    </Badge>
  );
}

type EmptyLabelProps = { id: string; label: SlotLabel; optional: boolean };

function EmptyLabel({ id, label, optional }: EmptyLabelProps) {
  const content = (
    <>
      {label.text}
      {optional && <OptionalSuffix />}
    </>
  );
  if (label.level) {
    return (
      <DocumentHeading id={id} level={label.level} className={label.className}>
        {content}
      </DocumentHeading>
    );
  }
  return (
    <p id={id} className={label.className ?? EMPTY_LABEL_CLASS}>
      {content}
    </p>
  );
}

function crossesSlotEdge(event: FocusEvent<HTMLElement>): boolean {
  const other = event.relatedTarget;
  if (other instanceof Node && event.currentTarget.contains(other)) return false;
  return other !== null || document.hasFocus();
}

type EditableSlotProps = Omit<TextSlotProps, 'view' | 'unwritten'> & { editing: DocumentEditing; text: ProgramText };

type FocusTarget = 'editor' | 'edit' | null;

function EditableSlot({ editing, target, text, label, labelledBy, className, typography, children }: EditableSlotProps) {
  const [open, setOpen] = useState(false);
  const editor = useRef<RichTextEditorHandle>(null);
  const editButton = useRef<HTMLButtonElement>(null);
  const focusNext = useRef<FocusTarget>(null);
  const restoringFocus = useRef(false);
  const theme = useEditorTheme(typography);
  const ownLabelId = useId();
  const hintId = useId();
  const pendingId = useId();
  const written = isWritten(text.value);

  useEffect(() => {
    restoringFocus.current = true;
    if (focusNext.current === 'editor') editor.current?.focus();
    if (focusNext.current === 'edit') editButton.current?.focus();
    restoringFocus.current = false;
    focusNext.current = null;
  }, [open]);

  function start() {
    focusNext.current = 'editor';
    setOpen(true);
  }

  function finish() {
    focusNext.current = written ? 'edit' : 'editor';
    setOpen(false);
  }

  function reset() {
    const previous = text.value;
    editor.current?.focus();
    editing.reset(target);
    showUndoToast({ message: 'Standard text restored', onUndo: () => editing.write(target, previous) });
  }

  if (!open && written) {
    return (
      <div onClick={start} className={cn('group/slot cursor-text rounded-field outline-offset-4 hover:outline hover:outline-control-border-soft', className)}>
        <div className={cn('float-right ml-2 flex items-center gap-2', { 'sm:contents': !text.pending })}>
          {text.pending && <PendingBadge />}
          <Button
            ref={editButton}
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={`Edit ${text.name}`}
            onClick={event => {
              event.stopPropagation();
              start();
            }}
            className={EDIT_BUTTON_CLASS}
          >
            <Pencil />
          </Button>
        </div>
        {children(text.value)}
      </div>
    );
  }

  const ownLabel = !written && !labelledBy;
  const head = ownLabel || Boolean(text.hint) || text.pending;
  const describedBy = [text.hint ? hintId : '', text.pending ? pendingId : ''].filter(Boolean).join(' ') || undefined;

  return (
    <div
      className={cn('grid gap-1.5', className)}
      onFocus={event => {
        if (!restoringFocus.current && crossesSlotEdge(event)) setOpen(true);
      }}
      onBlur={event => {
        if (crossesSlotEdge(event)) setOpen(false);
      }}
      onPointerDown={() => setOpen(true)}
    >
      {head && (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {ownLabel && <EmptyLabel id={ownLabelId} label={label ?? { text: text.name }} optional={text.optional} />}
          {text.hint && (
            <p id={hintId} className="text-sm text-text-secondary">
              {text.hint}
            </p>
          )}
          {text.pending && <PendingBadge id={pendingId} />}
        </div>
      )}
      <RichTextEditor
        ref={editor}
        label={text.name}
        labelledBy={labelledBy ?? (ownLabel ? ownLabelId : undefined)}
        describedBy={describedBy}
        placeholder={text.placeholder}
        value={text.value}
        format={PROGRAM_TEXT_FORMAT}
        theme={theme}
        tools={TOOLS[text.formatting]}
        lines={text.formatting === 'plain' ? 'one' : 'many'}
        controls={open ? 'shown' : 'reserved'}
        className={cn({ '-mx-3': written, '-mt-2': written && !head })}
        onChange={value => {
          editing.write(target, value);
          setOpen(true);
        }}
        onEscape={finish}
        actions={
          <>
            {isCustomised(text) && (
              <Button type="button" variant="ghost" size="xs" onClick={reset}>
                Reset to standard text
              </Button>
            )}
            <Button type="button" variant="outline" size="xs" onClick={finish}>
              Done<span className="sr-only">{` editing ${text.name}`}</span>
            </Button>
          </>
        }
      />
    </div>
  );
}

export function DocumentTextSlot({ view, target, label, labelledBy, className, unwritten, typography, children }: TextSlotProps) {
  const editing = useDocumentEditing();
  const text = textOf(view, target);
  if (editing) {
    return (
      <EditableSlot editing={editing} target={target} text={text} label={label} labelledBy={labelledBy} className={className} typography={typography}>
        {children}
      </EditableSlot>
    );
  }
  if (isWritten(text.value)) return <div className={className}>{children(text.value)}</div>;
  return unwritten ? <div className={className}>{unwritten}</div> : null;
}
