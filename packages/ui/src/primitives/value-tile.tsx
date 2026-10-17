import type { ReactNode } from "react";

import { cn } from "../lib/cn";
import type { DataAttributes } from "../lib/data-attributes";
import { VALUE_CLASS } from "../lib/typography";

const TONE_FILLS = {
  base: "bg-surface-base",
  quiet: "bg-surface-quiet",
  "tint-red": "bg-tint-red-soft",
  "tint-blue": "bg-tint-blue-soft",
  "tint-amber": "bg-tint-amber-soft",
} as const;

type ValueTileProps = DataAttributes & {
  label: string;
  value: ReactNode;
  tone: keyof typeof TONE_FILLS;
};

export function ValueTile({ label, value, tone, ...data }: ValueTileProps) {
  return (
    <div
      {...data}
      className={cn(
        "rounded-compact px-1.5 py-2 text-center",
        TONE_FILLS[tone],
      )}
      data-parity-root="ValueTile"
    >
      <dt className="text-label text-text-primary uppercase">{label}</dt>
      <dd className={cn(VALUE_CLASS, "leading-tight tabular-nums")}>{value}</dd>
    </div>
  );
}
