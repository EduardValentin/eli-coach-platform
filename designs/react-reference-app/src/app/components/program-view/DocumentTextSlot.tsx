import { Check, Pencil } from 'lucide-react';
import { forwardRef, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { isCustomised, isWritten, programText, type ProgramText, type ProgramTextTarget, type TextFormatting } from '../../domain/programTexts';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { RichTextEditor, type RichTextEditorHandle, type RichTextTheme, type RichTextTool } from '../ui/rich-text-editor';
import { cn } from '../ui/utils';
import { useDocumentEditing, useDocumentTypography, type DocumentEditing, type DocumentTypography } from './documentEditing';
import { TEMPLATE_TEXT_CLASSES } from './ProgramText';
import { PROGRAM_TEXT_FORMAT } from './programTextFormat';
import type { ProgramView } from './programView';

type TextSlotProps = {
  view: ProgramView;
  target: ProgramTextTarget;
  className?: string;
  unwritten?: ReactNode;
  typography?: Partial<DocumentTypography>;
  children: (value: string) => ReactNode;
};

type SlotButtonProps = { label: string; icon: ReactNode; onClick: () => void; className?: string };

const SLOT_BUTTON_CLASS = 'absolute top-0 right-0 text-text-secondary';
const SLOT_FRAME_CLASS = 'relative pr-10';
const TOOLS: Record<TextFormatting, readonly RichTextTool[]> = {
  plain: [],
  paragraphs: ['bold', 'italic', 'list'],
  titled: ['heading', 'bold', 'italic', 'list'],
};

const SlotButton = forwardRef<HTMLButtonElement, SlotButtonProps>(({ label, icon, onClick, className }, ref) => (
  <Button ref={ref} type="button" variant="ghost" size="icon-xs" aria-label={label} onClick={onClick} className={cn(SLOT_BUTTON_CLASS, className)}>
    {icon}
  </Button>
));
SlotButton.displayName = 'SlotButton';

function textOf(view: ProgramView, target: ProgramTextTarget): ProgramText {
  return programText(view.version, target, view.program.language);
}

export function useShowsText(view: ProgramView, target: ProgramTextTarget): boolean {
  const editing = useDocumentEditing();
  return editing !== null || isWritten(textOf(view, target).value);
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

type EditableSlotProps = Omit<TextSlotProps, 'view' | 'unwritten'> & { editing: DocumentEditing; text: ProgramText };

type FocusTarget = 'editor' | 'edit' | null;

function EditableSlot({ editing, target, text, className, typography, children }: EditableSlotProps) {
  const [open, setOpen] = useState(false);
  const editor = useRef<RichTextEditorHandle>(null);
  const theme = useEditorTheme(typography);
  const editButton = useRef<HTMLButtonElement>(null);
  const focusNext = useRef<FocusTarget>(null);
  const hintId = useId();
  const written = isWritten(text.value);
  const showsEditor = open || !written;
  const customised = isCustomised(text);

  useEffect(() => {
    if (focusNext.current === 'editor') editor.current?.focus();
    if (focusNext.current === 'edit') editButton.current?.focus();
    focusNext.current = null;
  }, [showsEditor]);

  function start() {
    focusNext.current = 'editor';
    setOpen(true);
  }

  function finish() {
    if (!written) return;
    focusNext.current = 'edit';
    setOpen(false);
  }

  if (!showsEditor) {
    return (
      <div className={cn('group/slot', SLOT_FRAME_CLASS, className)}>
        {children(text.value)}
        <SlotButton
          ref={editButton}
          label={`Edit ${text.name}`}
          icon={<Pencil />}
          onClick={start}
          className="opacity-0 transition-opacity group-hover/slot:opacity-100 focus-visible:opacity-100 max-sm:opacity-100 motion-reduce:transition-none [@media(hover:none)]:opacity-100"
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <div className={cn('grid gap-1.5', SLOT_FRAME_CLASS)}>
        <RichTextEditor
          ref={editor}
          label={text.name}
          describedBy={text.hint ? hintId : undefined}
          placeholder={text.placeholder}
          value={text.value}
          format={PROGRAM_TEXT_FORMAT}
          theme={theme}
          tools={TOOLS[text.formatting]}
          onChange={value => editing.write(target, value)}
          onFocus={() => setOpen(true)}
          onEscape={finish}
        />
        {(text.hint || text.pending || customised) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {text.hint && (
              <p id={hintId} className="text-xs text-text-secondary">
                {text.hint}
              </p>
            )}
            {text.pending && <Badge tone="pending">Romanian text pending</Badge>}
            {customised && (
              <Button type="button" variant="ghost" size="xs" className="ml-auto" onClick={() => editing.reset(target)}>
                Reset to standard text
              </Button>
            )}
          </div>
        )}
        {written && <SlotButton label={`Done editing ${text.name}`} icon={<Check />} onClick={finish} />}
      </div>
    </div>
  );
}

export function DocumentTextSlot({ view, target, className, unwritten, typography, children }: TextSlotProps) {
  const editing = useDocumentEditing();
  const text = textOf(view, target);
  if (editing) {
    return (
      <EditableSlot editing={editing} target={target} text={text} className={className} typography={typography}>
        {children}
      </EditableSlot>
    );
  }
  if (isWritten(text.value)) return <div className={className}>{children(text.value)}</div>;
  return unwritten ? <div className={className}>{unwritten}</div> : null;
}
