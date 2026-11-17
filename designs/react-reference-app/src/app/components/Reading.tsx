import type { ReactNode } from 'react';
import { cn } from './ui/utils';
import {
  DOCUMENT_EYEBROW_CLASS,
  DOCUMENT_FIGURE_CLASS,
  DOCUMENT_META_CLASS,
  LABEL_CLASS,
  VALUE_CLASS as BASE_VALUE_CLASS,
  VALUE_LG_CLASS,
  WIDGET_TITLE_CLASS,
} from './typography';

type ReadingSize = 'default' | 'md' | 'lg' | 'document';

const VALUE_CLASS: Record<ReadingSize, string> = {
  default: BASE_VALUE_CLASS,
  md: WIDGET_TITLE_CLASS,
  lg: cn(VALUE_LG_CLASS, 'tabular-nums'),
  document: DOCUMENT_FIGURE_CLASS,
};

const LABEL_CLASSES: Partial<Record<ReadingSize, string>> = { document: DOCUMENT_EYEBROW_CLASS };

const UNIT_CLASS: Record<ReadingSize, string> = {
  default: 'ml-1 text-xs font-normal text-text-secondary',
  md: 'ml-1 text-sm font-normal text-text-secondary',
  lg: 'ml-1 text-sm font-medium text-text-secondary tracking-normal',
  document: cn(DOCUMENT_META_CLASS, 'ml-[0.4em] font-normal'),
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
  detail?: ReactNode;
  detailParity?: string;
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
  detail,
  detailParity,
}: ReadingProps) {
  const LabelTag = as === 'dl-item' ? 'dt' : 'p';
  const ValueTag = as === 'dl-item' ? 'dd' : 'p';

  return (
    <div className={className}>
      <LabelTag
        className={cn(LABEL_CLASSES[size] ?? LABEL_CLASS, {
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
        {unit && <span className={UNIT_CLASS[size]}>{unit}</span>}
      </ValueTag>
      {detail != null && (
        <ValueTag
          className={cn('text-text-secondary', { 'mt-1 text-xs': size !== 'md', 'mt-0.5 text-sm tabular-nums': size === 'md' })}
          data-parity={detailParity}
        >
          {detail}
        </ValueTag>
      )}
    </div>
  );
}
