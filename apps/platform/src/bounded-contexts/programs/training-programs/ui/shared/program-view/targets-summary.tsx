import { cn } from "~/shared/design-system/lib";

import type { Target } from "./targets";

type TargetsSize = "sm" | "md";

const SIZE_CLASS: Record<TargetsSize, string> = {
  sm: "text-sm",
  md: "text-base",
};

type TargetsSummaryProps = {
  items: readonly Target[];
  size: TargetsSize;
  className?: string;
};

export function TargetsSummary({
  items,
  size,
  className,
}: TargetsSummaryProps) {
  if (items.length === 0) return null;

  return (
    <dl
      className={cn(
        "flex flex-wrap items-baseline gap-y-1 overflow-hidden leading-6 tabular-nums",
        SIZE_CLASS[size],
        className,
      )}
    >
      {items.map(({ term, value }) => (
        <div
          key={term}
          className="relative mr-6 flex flex-wrap items-baseline gap-x-1.5 before:absolute before:inset-y-1.5 before:-left-3 before:w-px before:bg-divider"
        >
          <dt className="self-center text-sm whitespace-nowrap text-text-secondary">
            {term}
          </dt>
          <dd className="inline-flex items-center gap-1 font-semibold text-text-primary">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
