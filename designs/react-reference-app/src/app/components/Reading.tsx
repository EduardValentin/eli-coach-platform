import type { ReactNode } from 'react';
import { cn } from './ui/utils';
import {
  LABEL_CLASS,
  VALUE_CLASS as BASE_VALUE_CLASS,
  VALUE_LG_CLASS,
} from './typography';

type ReadingSize = 'default' | 'lg';

const VALUE_CLASS: Record<ReadingSize, string> = {
  default: BASE_VALUE_CLASS,
  lg: cn(VALUE_LG_CLASS, 'tabular-nums'),
};

interface ReadingProps {
  label: ReactNode;
  labelAdornment?: ReactNode;
  value: ReactNode;
  size?: ReadingSize;
  unit?: string;
  className?: string;
  as?: 'dl-item' | 'block';
  valueParity?: string;
}

export function Reading({
  label,
  labelAdornment,
  value,
  size = 'default',
  unit,
  className,
  as = 'block',
  valueParity,
}: ReadingProps) {
  const LabelTag = as === 'dl-item' ? 'dt' : 'p';
  const ValueTag = as === 'dl-item' ? 'dd' : 'p';

  return (
    <div className={className}>
      <LabelTag
        className={cn(LABEL_CLASS, {
          'flex items-center gap-1': labelAdornment != null,
        })}
      >
        {label}
        {labelAdornment}
      </LabelTag>
      <ValueTag
        className={cn('mt-1', VALUE_CLASS[size])}
        data-parity={valueParity}
      >
        {value}
        {size === 'lg' && unit && (
          <span className="ml-1 text-sm font-medium text-text-secondary tracking-normal">
            {unit}
          </span>
        )}
      </ValueTag>
    </div>
  );
}
