import type { CSSProperties, Ref } from 'react';
import { Input } from '../../ui/input';

export const SESSION_ARTICLE_CLASS = 'rounded-card border border-border bg-card shadow-card';
export const EXPANDED_SESSION_CLASS = 'scroll-mt-4 lg:scroll-mt-(--block-header-height)';
export const SESSION_CONTENT_CLASS =
  '**:scroll-mt-[calc(var(--session-header-height)+0.5rem)] lg:**:scroll-mt-[calc(var(--block-header-height)+var(--session-header-height)+0.5rem)]';

export function sessionHeaderHeightStyle(height: number): CSSProperties {
  return { '--session-header-height': `${height}px` } as CSSProperties;
}

type CollapsedSessionHeaderProps = { headingId: string; name: string; summary: string; onExpand: () => void };

export function CollapsedSessionHeader({ headingId, name, summary, onExpand }: CollapsedSessionHeaderProps) {
  return (
    <h3>
      <button
        type="button"
        aria-expanded={false}
        onClick={onExpand}
        className="flex w-full flex-wrap items-baseline justify-between gap-2 rounded-card px-4 py-3 text-left outline-none hover:bg-surface-quiet"
      >
        <span id={headingId} className="font-serif text-lg text-text-primary">
          {name}
        </span>
        <span className="text-sm text-text-secondary tabular-nums">{summary}</span>
      </button>
    </h3>
  );
}

type SessionNameInputProps = { value: string; inputRef?: Ref<HTMLInputElement>; onChange: (name: string) => void };

export function SessionNameInput({ value, inputRef, onChange }: SessionNameInputProps) {
  return (
    <Input
      ref={inputRef}
      appearance="inline-title"
      className="flex-1 basis-40"
      aria-label="Session name"
      value={value}
      onChange={event => onChange(event.target.value)}
    />
  );
}
