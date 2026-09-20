import { type ReactNode } from 'react';
import { cn } from './ui/utils';

interface CheckboxChipProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  children: ReactNode;
  'aria-label'?: string;
}

const BASE_CLASS =
  'relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-4 text-sm font-semibold transition-colors';
const SELECTED_CLASS = 'border-brand/30 bg-brand-soft text-brand hover:border-brand';
const UNSELECTED_CLASS =
  'border-border text-muted-foreground hover:border-brand hover:text-brand';

// data-chip-control lets theme.css paint the focus ring on the label, since the opacity-0 input cannot show its own.
export function CheckboxChip({
  checked,
  onCheckedChange,
  children,
  ...props
}: CheckboxChipProps) {
  return (
    <label
      data-chip-control=""
      className={cn(BASE_CLASS, checked ? SELECTED_CLASS : UNSELECTED_CLASS)}
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
