import { type ReactNode } from 'react';
import { cn } from './ui/utils';

export type CheckboxChipSize = 'touch' | 'compact';

interface CheckboxChipProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  children: ReactNode;
  size?: CheckboxChipSize;
  'aria-label'?: string;
}

const SIZE_CLASSES: Record<
  CheckboxChipSize,
  { base: string; selected: string; unselected: string }
> = {
  touch: {
    base: 'relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-4 text-sm font-semibold transition-colors',
    selected:
      'border-primary bg-active-surface text-primary-foreground hover:bg-primary-hover',
    unselected:
      'border-border text-muted-foreground hover:border-primary hover:text-primary',
  },
  compact: {
    base: 'relative inline-flex h-8 min-w-8 cursor-pointer items-center justify-center gap-2 rounded-full border px-3 text-center text-xs font-medium whitespace-nowrap outline-none transition-[color,box-shadow]',
    selected: 'border-primary bg-primary text-primary-foreground',
    unselected:
      'border-border-default text-text-muted has-focus-visible:border-focus-ring hover:bg-primary-soft hover:text-primary',
  },
};

export function CheckboxChip({
  checked,
  onCheckedChange,
  children,
  size = 'touch',
  ...props
}: CheckboxChipProps) {
  const classes = SIZE_CLASSES[size];
  return (
    <label
      data-chip-control=""
      className={cn(
        classes.base,
        checked ? classes.selected : classes.unselected,
      )}
    >
      <input
        type="checkbox"
        className="absolute inset-0 cursor-pointer opacity-0"
        checked={checked}
        onChange={(event) => onCheckedChange(event.target.checked)}
        {...props}
      />
      <span aria-hidden="true">{children}</span>
    </label>
  );
}
