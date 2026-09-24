import type { ReactNode } from 'react';
import { cn } from './ui/utils';

type ReadingSize = 'default' | 'lg';

const VALUE_CLASS: Record<ReadingSize, string> = {
  default: 'text-sm font-semibold text-text-primary',
  lg: 'text-2xl font-semibold tracking-tight text-text-primary',
};

interface ReadingProps {
  label: ReactNode;
  value: ReactNode;
  size?: ReadingSize;
  unit?: string;
  className?: string;
  as?: 'dl-item' | 'block';
}

export function Reading({
  label,
  value,
  size = 'default',
  unit,
  className,
  as = 'block',
}: ReadingProps) {
  const LabelTag = as === 'dl-item' ? 'dt' : 'p';
  const ValueTag = as === 'dl-item' ? 'dd' : 'p';

  return (
    <div className={className}>
      <LabelTag className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
        {label}
      </LabelTag>
      <ValueTag className={cn('mt-1', VALUE_CLASS[size])}>
        {value}
        {size === 'lg' && unit && (
          <span className="ml-1 text-xs font-semibold text-text-secondary">
            {unit}
          </span>
        )}
      </ValueTag>
    </div>
  );
}
