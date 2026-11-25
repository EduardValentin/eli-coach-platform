import type { CSSProperties, Ref } from "react";

import { cn, SCREEN_CARD_TITLE_CLASS } from "~/shared/design-system/lib";
import { Input } from "~/shared/design-system/primitives";

export const SESSION_NAME_LABEL = "Session name";
export const SESSION_ARTICLE_CLASS =
  "rounded-card border border-border-default bg-surface-base shadow-card";
export const EXPANDED_SESSION_CLASS =
  "scroll-mt-4 lg:scroll-mt-(--block-header-height)";
export const SESSION_CONTENT_CLASS =
  "**:scroll-mt-[calc(var(--session-header-height)+0.5rem)] lg:**:scroll-mt-[calc(var(--block-header-height)+var(--session-header-height)+0.5rem)]";

export function sessionHeaderHeightStyle(height: number): CSSProperties {
  return { "--session-header-height": `${height}px` } as CSSProperties;
}

type CollapsedSessionHeaderProps = {
  headingId: string;
  name: string;
  summary: string;
  onExpand: () => void;
};

export function CollapsedSessionHeader({
  headingId,
  name,
  summary,
  onExpand,
}: CollapsedSessionHeaderProps) {
  return (
    <h3>
      <button
        aria-expanded={false}
        className="flex w-full flex-wrap items-baseline justify-between gap-2 rounded-card px-4 py-3 text-left outline-none hover:bg-surface-quiet"
        onClick={onExpand}
        type="button"
      >
        <span className={SCREEN_CARD_TITLE_CLASS} id={headingId}>
          {name}
        </span>
        <span className="text-sm text-text-secondary tabular-nums">
          {summary}
        </span>
      </button>
    </h3>
  );
}

type SessionNameInputProps = {
  value: string;
  inputRef?: Ref<HTMLInputElement>;
  onChange: (name: string) => void;
};

const INLINE_TITLE_CLASS =
  "flex-1 basis-40 md:text-lg rounded-none focus-visible:rounded-field border-x-0 border-t-0 border-b border-transparent bg-transparent px-1 shadow-none hover:border-text-secondary";

export function SessionNameInput({
  value,
  inputRef,
  onChange,
}: SessionNameInputProps) {
  return (
    <Input
      aria-label={SESSION_NAME_LABEL}
      className={cn(SCREEN_CARD_TITLE_CLASS, INLINE_TITLE_CLASS)}
      onChange={(event) => onChange(event.target.value)}
      ref={inputRef}
      value={value}
    />
  );
}
