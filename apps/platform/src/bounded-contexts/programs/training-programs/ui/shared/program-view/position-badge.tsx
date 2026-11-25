import { cva, type VariantProps } from "class-variance-authority";

const positionBadgeVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-full bg-surface-neutral font-semibold text-text-primary tabular-nums",
  {
    variants: {
      size: {
        sm: "h-7 min-w-7 px-1.5 text-xs",
        md: "size-8 text-xs",
      },
    },
  },
);

type PositionBadgeProps = Required<
  Pick<VariantProps<typeof positionBadgeVariants>, "size">
> & { label: string };

export function PositionBadge({ label, size }: PositionBadgeProps) {
  return <span className={positionBadgeVariants({ size })}>{label}</span>;
}
