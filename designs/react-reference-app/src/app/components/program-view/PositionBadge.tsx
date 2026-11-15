import { cva, type VariantProps } from 'class-variance-authority';

const positionBadgeVariants = cva('inline-flex shrink-0 items-center justify-center rounded-full font-semibold tabular-nums', {
  variants: {
    size: {
      xs: 'h-5 min-w-5 px-1 text-document-note',
      sm: 'h-7 min-w-7 px-1.5 text-xs',
      md: 'size-8 text-xs',
    },
    tone: {
      inverted: 'bg-surface-inverted text-surface-inverted-foreground',
      'check-in': 'bg-check-in-marker text-surface-base print:h-[3.8mm] print:min-w-[3.8mm]',
    },
  },
  defaultVariants: {
    tone: 'inverted',
  },
});

type PositionBadgeProps = Required<Pick<VariantProps<typeof positionBadgeVariants>, 'size'>> &
  Pick<VariantProps<typeof positionBadgeVariants>, 'tone'> & {
    label: string;
    dateTime?: string;
  };

export function PositionBadge({ label, size, tone, dateTime }: PositionBadgeProps) {
  const className = positionBadgeVariants({ size, tone });
  if (dateTime) {
    return (
      <time dateTime={dateTime} className={className}>
        {label}
      </time>
    );
  }
  return <span className={className}>{label}</span>;
}
