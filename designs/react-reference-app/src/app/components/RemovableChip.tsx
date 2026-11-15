import { X } from 'lucide-react';

type RemovableChipProps = { label: string; removeLabel: string; onRemove: () => void };

export function RemovableChip({ label, removeLabel, onRemove }: RemovableChipProps) {
  return (
    <li className="inline-flex min-h-8 max-w-full items-center gap-1 rounded-full border border-border bg-surface-base py-0.5 pr-1 pl-3 text-sm text-text-primary">
      <span className="min-w-0 break-words">{label}</span>
      <button
        type="button"
        aria-label={removeLabel}
        onClick={onRemove}
        className="relative hit-area inline-flex size-6 shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-muted-hover hover:text-text-primary"
      >
        <X aria-hidden="true" className="size-3.5" />
      </button>
    </li>
  );
}
