import { X } from 'lucide-react';
import { Button } from './ui/button';

type RemovableChipProps = { label: string; removeLabel: string; onRemove: () => void };

export function RemovableChip({ label, removeLabel, onRemove }: RemovableChipProps) {
  return (
    <li className="flex min-w-0 items-center gap-1 rounded-full border border-border bg-surface-base py-0.5 pr-0.5 pl-3 text-sm text-text-primary">
      <span className="min-w-0 break-words">{label}</span>
      <Button variant="ghost" size="icon-xs" aria-label={removeLabel} onClick={onRemove}>
        <X aria-hidden="true" />
      </Button>
    </li>
  );
}
