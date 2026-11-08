import type { ComponentPropsWithoutRef } from 'react';
import { cn } from './ui/utils';

const PRODUCT_TAG_SIZES = {
  sm: 'px-2 py-1',
  md: 'px-3 py-1.5',
} as const;

const PRODUCT_TAG_TONES = {
  paid: 'bg-card bg-linear-to-r from-brand-soft to-brand-soft text-brand',
  free: 'bg-card bg-linear-to-r from-brand-secondary-soft to-brand-secondary-soft text-brand-secondary',
  goal: 'bg-surface-subtle text-copy-muted',
} as const;

type ProductTagProps = ComponentPropsWithoutRef<'span'> & {
  size: keyof typeof PRODUCT_TAG_SIZES;
  tone: keyof typeof PRODUCT_TAG_TONES;
};

export function ProductTag({ className, size, tone, ...props }: ProductTagProps) {
  return (
    <span
      className={cn('rounded-tile text-label uppercase', PRODUCT_TAG_SIZES[size], PRODUCT_TAG_TONES[tone], className)}
      {...props}
    />
  );
}
