import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { Plus, X } from 'lucide-react';
import {
  hasTag,
  isNewTag,
  normalizeTag,
  resolveTag,
  tagSuggestions,
  withTag,
  withoutTag,
} from '../domain/tags';
import { fieldSurfaceClass } from './ui/input';
import { Popover, PopoverAnchor, PopoverContent } from './ui/popover';
import { cn } from './ui/utils';

type TagOption = { kind: 'existing' | 'create'; tag: string };

type TagInputProps = {
  id?: string;
  value: readonly string[];
  onChange: (tags: string[]) => void;
  vocabulary: readonly string[];
  placeholder?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
};

function optionsFor(
  text: string,
  vocabulary: readonly string[],
  chosen: readonly string[],
): TagOption[] {
  const existing = tagSuggestions(text, vocabulary, chosen).map(
    (tag): TagOption => ({ kind: 'existing', tag }),
  );
  const creatable = isNewTag(text, vocabulary) && !hasTag(chosen, text);

  return creatable
    ? [...existing, { kind: 'create', tag: normalizeTag(text) }]
    : existing;
}

function TagChip({ tag, onRemove }: { tag: string; onRemove: () => void }) {
  return (
    <li className="inline-flex h-8 max-w-full items-center gap-1 rounded-tile bg-surface-neutral pr-1 pl-2.5 text-sm text-text-primary">
      <span className="truncate">{tag}</span>
      <button
        aria-label={`Remove ${tag}`}
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-muted-hover hover:text-text-primary"
        onClick={onRemove}
        type="button"
      >
        <X aria-hidden="true" className="size-3.5" />
      </button>
    </li>
  );
}

export const TagInput = forwardRef<HTMLInputElement, TagInputProps>(
  (
    {
      id,
      value,
      onChange,
      vocabulary,
      placeholder,
      'aria-describedby': describedBy,
      'aria-invalid': invalid,
    },
    ref,
  ) => {
    const listboxId = useId();
    const optionIdPrefix = useId();
    const frame = useRef<HTMLDivElement>(null);
    const entry = useRef<HTMLInputElement | null>(null);
    const [text, setText] = useState('');
    const [expanded, setExpanded] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const options = optionsFor(text, vocabulary, value);
    const shown = expanded && options.length > 0;
    const active = shown ? options[activeIndex] : undefined;

    useEffect(() => {
      if (!shown) return;

      const collapseBeforeTheDialogHearsEscape = (event: globalThis.KeyboardEvent) => {
        if (event.key !== 'Escape') return;
        event.stopPropagation();
        setExpanded(false);
      };
      window.addEventListener('keydown', collapseBeforeTheDialogHearsEscape, true);

      return () =>
        window.removeEventListener('keydown', collapseBeforeTheDialogHearsEscape, true);
    }, [shown]);

    const setEntry = (node: HTMLInputElement | null) => {
      entry.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    };

    const choose = (tag: string) => {
      onChange(withTag(value, tag));
      setText('');
      setActiveIndex(-1);
    };

    const commitText = () => {
      const tag = resolveTag(text, [...value, ...vocabulary]);
      if (tag) choose(tag);
    };

    const changeText = (next: string) => {
      setText(next);
      setExpanded(true);
      setActiveIndex(normalizeTag(next).length > 0 ? 0 : -1);
    };

    const moveActive = (step: 1 | -1) => {
      if (!shown) {
        setExpanded(true);
        setActiveIndex(step === 1 ? 0 : options.length - 1);
        return;
      }
      setActiveIndex((current) => (current + step + options.length) % options.length);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
      const hasText = normalizeTag(text).length > 0;

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        moveActive(event.key === 'ArrowDown' ? 1 : -1);
        return;
      }
      if (event.key === 'Enter' && (active || hasText)) {
        event.preventDefault();
        if (active) choose(active.tag);
        else commitText();
        return;
      }
      if (event.key === ',') {
        event.preventDefault();
        commitText();
        return;
      }
      if (event.key === 'Backspace' && text.length === 0 && value.length > 0) {
        onChange(withoutTag(value, value[value.length - 1]));
      }
    };

    const focusEntry = (event: MouseEvent<HTMLDivElement>) => {
      if (event.target !== frame.current) return;
      event.preventDefault();
      entry.current?.focus();
    };

    return (
      <Popover
        open={shown}
        onOpenChange={(open) => {
          if (!open) setExpanded(false);
        }}
      >
        <PopoverAnchor asChild>
          <div
            className={cn(
              fieldSurfaceClass,
              'min-h-(--size-control-md) cursor-text flex-wrap items-center gap-1.5 px-3 py-1.5 focus-within:border-focus-ring',
              { 'border-destructive': invalid === true },
            )}
            data-field-frame=""
            onMouseDown={focusEntry}
            ref={frame}
          >
            {value.length > 0 && (
              <ul aria-label="Chosen tags" className="contents">
                {value.map((tag) => (
                  <TagChip
                    key={tag}
                    onRemove={() => {
                      onChange(withoutTag(value, tag));
                      entry.current?.focus();
                    }}
                    tag={tag}
                  />
                ))}
              </ul>
            )}
            <input
              aria-activedescendant={
                active ? `${optionIdPrefix}-${options.indexOf(active)}` : undefined
              }
              aria-autocomplete="list"
              aria-controls={shown ? listboxId : undefined}
              aria-describedby={describedBy}
              aria-expanded={shown}
              aria-invalid={invalid}
              autoComplete="off"
              className="h-8 min-w-24 flex-1 bg-transparent text-base text-text-primary outline-none placeholder:text-muted-foreground md:text-sm"
              data-field-entry=""
              enterKeyHint="enter"
              id={id}
              onBlur={() => {
                commitText();
                setExpanded(false);
              }}
              onChange={(event) => changeText(event.target.value)}
              onClick={() => setExpanded(true)}
              onFocus={() => setExpanded(true)}
              onKeyDown={handleKeyDown}
              placeholder={value.length === 0 ? placeholder : undefined}
              ref={setEntry}
              role="combobox"
              type="text"
              value={text}
            />
          </div>
        </PopoverAnchor>
        <PopoverContent
          align="start"
          className="w-(--radix-popover-trigger-width) max-h-64 p-1"
          onInteractOutside={(event) => {
            if (frame.current?.contains(event.target as Node)) event.preventDefault();
          }}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          <ul aria-label="Tag suggestions" id={listboxId} role="listbox">
            {options.map((option, index) => (
              <li
                aria-selected={index === activeIndex}
                className={cn(
                  'flex cursor-default items-center gap-2 rounded-tile px-2 py-1.5 text-sm text-text-primary select-none',
                  { 'bg-accent text-accent-foreground': index === activeIndex },
                )}
                id={`${optionIdPrefix}-${index}`}
                key={`${option.kind}-${option.tag}`}
                onClick={() => choose(option.tag)}
                onMouseDown={(event) => event.preventDefault()}
                onMouseMove={() => setActiveIndex(index)}
                role="option"
              >
                {option.kind === 'create' ? (
                  <>
                    <Plus aria-hidden="true" className="size-4 shrink-0 text-text-secondary" />
                    <span className="truncate">Create “{option.tag}”</span>
                  </>
                ) : (
                  <span className="truncate">{option.tag}</span>
                )}
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
    );
  },
);

TagInput.displayName = 'TagInput';
