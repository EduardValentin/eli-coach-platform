import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/cn";

const metricTileTone = cva("shrink-0", {
  defaultVariants: { tone: "neutral" },
  variants: {
    tone: {
      brand: "text-brand-primary",
      neutral: "text-text-muted",
    },
  },
});

export type MetricTileProps = VariantProps<typeof metricTileTone> & {
  className?: string;
  hint?: React.ReactNode;
  /** Rendered before the label; the tone colours it. */
  icon?: React.ReactNode;
  /** Rendered after the label, e.g. an explanatory tooltip trigger. */
  suffix?: React.ReactNode;
  label: string;
  value: React.ReactNode;
};

/**
 * One figure with its name. The value is wrapped so a long reading cannot break
 * mid-number, which is what makes a row of these line up.
 */
export function MetricTile({
  className,
  hint,
  icon,
  label,
  suffix,
  tone,
  value,
}: MetricTileProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-field-multiline border border-border-subtle bg-surface-base p-4",
        className,
      )}
    >
      {/* The tone rides on the icon rather than the label: a row of tiles reads
          as one set when every name is set the same way, and colouring a whole
          label makes that tile look like a different kind of thing. */}
      <span className="inline-flex items-center gap-1.5 text-label font-semibold uppercase tracking-widest text-text-muted">
        {icon && <span className={metricTileTone({ tone })}>{icon}</span>}
        {label}
        {suffix}
      </span>
      <span className="whitespace-nowrap text-body-lg text-text-primary">
        {value}
      </span>
      {hint && <span className="text-label text-text-muted">{hint}</span>}
    </div>
  );
}
