import { Plus, X } from "lucide-react";
import * as React from "react";

import { cn } from "../lib/cn";
import { FIELD_FRAME_CLASS } from "./field-frame";
import { Popover, PopoverAnchor, PopoverContent } from "./popover";

type TagSuggestion = { kind: "existing" | "create"; tag: string };

type TagInputProps = {
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  id?: string;
  maxLength: number;
  onChange: (tags: string[]) => void;
  placeholder?: string;
  value: readonly string[];
  vocabulary: readonly string[];
};

function normalizeTag(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function sameTag(one: string, other: string): boolean {
  return normalizeTag(one).toLowerCase() === normalizeTag(other).toLowerCase();
}

function hasTag(tags: readonly string[], tag: string): boolean {
  return tags.some((existing) => sameTag(existing, tag));
}

function resolveTag(
  text: string,
  vocabulary: readonly string[],
): string | null {
  const tag = normalizeTag(text);
  if (tag.length === 0) return null;

  return vocabulary.find((existing) => sameTag(existing, tag)) ?? tag;
}

function withTag(tags: readonly string[], tag: string): string[] {
  return hasTag(tags, tag) ? [...tags] : [...tags, normalizeTag(tag)];
}

function withoutTag(tags: readonly string[], tag: string): string[] {
  return tags.filter((existing) => !sameTag(existing, tag));
}

function compareTags(one: string, other: string): number {
  return one.localeCompare(other, undefined, { sensitivity: "base" });
}

function tagSuggestions(
  query: string,
  vocabulary: readonly string[],
  chosen: readonly string[],
): string[] {
  const needle = normalizeTag(query).toLowerCase();
  const matching = vocabulary.filter(
    (tag) => !hasTag(chosen, tag) && tag.toLowerCase().includes(needle),
  );
  const startsWithNeedle = (tag: string) =>
    tag.toLowerCase().startsWith(needle) ? 0 : 1;

  return matching.sort(
    (one, other) =>
      startsWithNeedle(one) - startsWithNeedle(other) ||
      compareTags(one, other),
  );
}

function optionsFor(
  text: string,
  vocabulary: readonly string[],
  chosen: readonly string[],
): TagSuggestion[] {
  const existing = tagSuggestions(text, vocabulary, chosen).map(
    (tag): TagSuggestion => ({ kind: "existing", tag }),
  );
  const tag = normalizeTag(text);
  const creatable =
    tag.length > 0 && !hasTag(vocabulary, tag) && !hasTag(chosen, tag);

  return creatable ? [...existing, { kind: "create", tag }] : existing;
}

function TagChip({ onRemove, tag }: { onRemove: () => void; tag: string }) {
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

type SuggestionOptionProps = {
  active: boolean;
  id: string;
  onChoose: () => void;
  onHover: () => void;
  suggestion: TagSuggestion;
};

function SuggestionOption({
  active,
  id,
  onChoose,
  onHover,
  suggestion,
}: SuggestionOptionProps) {
  return (
    <div
      aria-selected={active}
      className={cn(
        "flex cursor-default items-center gap-2 rounded-tile px-2 py-1.5 text-sm text-text-primary select-none",
        { "bg-primary-soft text-primary": active },
      )}
      id={id}
      onMouseDown={(event) => {
        event.preventDefault();
        onChoose();
      }}
      onMouseMove={onHover}
      role="option"
      tabIndex={-1}
    >
      {suggestion.kind === "create" ? (
        <>
          <Plus
            aria-hidden="true"
            className="size-4 shrink-0 text-text-secondary"
          />
          <span className="truncate">Create “{suggestion.tag}”</span>
        </>
      ) : (
        <span className="truncate">{suggestion.tag}</span>
      )}
    </div>
  );
}

export const TagInput = React.forwardRef<HTMLInputElement, TagInputProps>(
  (
    {
      "aria-describedby": describedBy,
      "aria-invalid": invalid,
      id,
      maxLength,
      onChange,
      placeholder,
      value,
      vocabulary,
    },
    ref,
  ) => {
    const listboxId = React.useId();
    const optionIdPrefix = React.useId();
    const frame = React.useRef<HTMLDivElement>(null);
    const entry = React.useRef<HTMLInputElement | null>(null);
    const [text, setText] = React.useState("");
    const [expanded, setExpanded] = React.useState(false);
    const [activeIndex, setActiveIndex] = React.useState(-1);
    const options = optionsFor(text, vocabulary, value);
    const shown = expanded && options.length > 0;
    const active = shown ? options[activeIndex] : undefined;

    React.useEffect(() => {
      if (!shown) return;

      const collapseBeforeTheDialogHearsEscape = (event: KeyboardEvent) => {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        setExpanded(false);
      };
      window.addEventListener(
        "keydown",
        collapseBeforeTheDialogHearsEscape,
        true,
      );

      return () =>
        window.removeEventListener(
          "keydown",
          collapseBeforeTheDialogHearsEscape,
          true,
        );
    }, [shown]);

    const setEntry = (node: HTMLInputElement | null) => {
      entry.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    };

    const choose = (tag: string) => {
      onChange(withTag(value, tag));
      setText("");
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
      setActiveIndex(
        (current) => (current + step + options.length) % options.length,
      );
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      const hasText = normalizeTag(text).length > 0;

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        moveActive(event.key === "ArrowDown" ? 1 : -1);
        return;
      }
      if (event.key === "Enter" && (active || hasText)) {
        event.preventDefault();
        if (active) choose(active.tag);
        else commitText();
        return;
      }
      if (event.key === ",") {
        event.preventDefault();
        commitText();
        return;
      }
      if (event.key === "Backspace" && text.length === 0 && value.length > 0) {
        onChange(withoutTag(value, value[value.length - 1]));
      }
    };

    const focusEntry = (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target !== frame.current) return;
      event.preventDefault();
      entry.current?.focus();
    };

    return (
      <Popover
        onOpenChange={(open) => {
          if (!open) setExpanded(false);
        }}
        open={shown}
      >
        <PopoverAnchor asChild>
          <div
            className={cn(
              FIELD_FRAME_CLASS,
              "flex min-h-(--size-control-md) min-w-0 cursor-text flex-wrap items-center gap-1.5 px-3 py-1.5 text-base focus-within:border-focus-ring md:text-sm",
              { "border-feedback-danger": invalid === true },
            )}
            data-field-frame=""
            onMouseDown={focusEntry}
            ref={frame}
            role="presentation"
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
                active
                  ? `${optionIdPrefix}-${options.indexOf(active)}`
                  : undefined
              }
              aria-autocomplete="list"
              aria-controls={shown ? listboxId : undefined}
              aria-describedby={describedBy}
              aria-expanded={shown}
              aria-invalid={invalid}
              autoComplete="off"
              className="h-8 min-w-24 flex-1 bg-transparent text-base text-text-primary outline-none placeholder:text-text-muted md:text-sm"
              data-field-entry=""
              enterKeyHint="enter"
              id={id}
              maxLength={maxLength}
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
          className="max-h-64 w-(--radix-popover-trigger-width) p-1"
          onCloseAutoFocus={(event) => event.preventDefault()}
          onInteractOutside={(event) => {
            if (frame.current?.contains(event.target as Node)) {
              event.preventDefault();
            }
          }}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <div aria-label="Tag suggestions" id={listboxId} role="listbox">
            {options.map((option, index) => (
              <SuggestionOption
                active={index === activeIndex}
                id={`${optionIdPrefix}-${index}`}
                key={`${option.kind}-${option.tag}`}
                onChoose={() => choose(option.tag)}
                onHover={() => setActiveIndex(index)}
                suggestion={option}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  },
);

TagInput.displayName = "TagInput";
