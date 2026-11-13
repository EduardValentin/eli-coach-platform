import { Check, Pencil } from 'lucide-react';
import { forwardRef, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { isCustomised, isWritten, programText, type ProgramText, type ProgramTextTarget } from '../../domain/programTexts';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { cn } from '../ui/utils';
import { useDocumentEditing, type DocumentEditing } from './documentEditing';
import type { ProgramView } from './programView';

type TextSlotProps = {
  view: ProgramView;
  target: ProgramTextTarget;
  className?: string;
  unwritten?: ReactNode;
  children: (value: string) => ReactNode;
};

type SlotButtonProps = { label: string; icon: ReactNode; onClick: () => void; className?: string };

const SLOT_BUTTON_CLASS =
  'absolute top-0 right-0 text-text-secondary sm:right-auto sm:-left-11';

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

type EditableSlotProps = Omit<TextSlotProps, 'view' | 'unwritten'> & { editing: DocumentEditing; text: ProgramText };

type FocusTarget = 'textarea' | 'edit' | null;

function EditableSlot({ editing, target, text, className, children }: EditableSlotProps) {
  const [open, setOpen] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const editButton = useRef<HTMLButtonElement>(null);
  const focusNext = useRef<FocusTarget>(null);
  const hintId = useId();
  const written = isWritten(text.value);
  const showsTextarea = open || !written;
  const customised = isCustomised(text);

  useEffect(() => {
    if (focusNext.current === 'textarea' && textarea.current) {
      const { length } = textarea.current.value;
      textarea.current.focus();
      textarea.current.setSelectionRange(length, length);
    }
    if (focusNext.current === 'edit') editButton.current?.focus();
    focusNext.current = null;
  }, [showsTextarea]);

  function start() {
    focusNext.current = 'textarea';
    setOpen(true);
  }

  function finish() {
    if (!written) return;
    focusNext.current = 'edit';
    setOpen(false);
  }

  function finishOnEscape(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Escape' || !written) return;
    event.preventDefault();
    event.stopPropagation();
    finish();
  }

  if (!showsTextarea) {
    return (
      <div className={cn('group/slot relative max-sm:pr-10', className)}>
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
      <div className="relative grid gap-1.5 max-sm:pr-10">
        <Textarea
          ref={textarea}
          aria-label={text.name}
          aria-describedby={text.hint ? hintId : undefined}
          placeholder={text.placeholder}
          value={text.value}
          onChange={event => editing.write(target, event.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={finishOnEscape}
          className="text-document-body md:text-document-body"
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

export function DocumentTextSlot({ view, target, className, unwritten, children }: TextSlotProps) {
  const editing = useDocumentEditing();
  const text = textOf(view, target);
  if (editing) {
    return (
      <EditableSlot editing={editing} target={target} text={text} className={className}>
        {children}
      </EditableSlot>
    );
  }
  if (isWritten(text.value)) return <div className={className}>{children(text.value)}</div>;
  return unwritten ? <div className={className}>{unwritten}</div> : null;
}
