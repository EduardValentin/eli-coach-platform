import { type ReactNode } from 'react';
import { Toggle } from './ui/toggle';

interface ToggleChipProps {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  children: ReactNode;
  'aria-label'?: string;
}

/**
 * The single multi-selection chip used across the app: a rounded pill with a
 * soft brand-tinted selected state, built on the accessible `Toggle` primitive
 * (`aria-pressed` + keyboard for free). Use anywhere a user picks several short
 * options from a set — muscles, equipment, conditions, symptoms, filters.
 */
export function ToggleChip({ pressed, onPressedChange, children, ...props }: ToggleChipProps) {
  return (
    <Toggle
      variant="outline"
      size="sm"
      pressed={pressed}
      onPressedChange={onPressedChange}
      className="rounded-full border border-border px-3 text-xs font-medium text-muted-foreground data-[state=on]:border-brand/30 data-[state=on]:bg-brand-soft data-[state=on]:text-brand"
      {...props}
    >
      {children}
    </Toggle>
  );
}
