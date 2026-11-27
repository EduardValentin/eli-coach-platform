import type { ReactNode } from "react";

import { cn } from "~/shared/design-system/lib";

import { formatRange, type Range } from "./program-view";

type EffortTone = "low" | "mid" | "high";

const HIGH_EFFORT_UP_TO_RIR = 1;
const MID_EFFORT_RIR = 2;

const TONE_CLASS: Record<EffortTone, string> = {
  low: "bg-effort-low-soft text-effort-low-ink",
  mid: "bg-effort-mid-soft text-effort-mid-ink",
  high: "bg-effort-high-fill text-surface-base",
};

/** A span of sets takes the tone of its hardest set. */
function effortOf(lowest: number): EffortTone {
  if (lowest <= HIGH_EFFORT_UP_TO_RIR) return "high";

  return lowest === MID_EFFORT_RIR ? "mid" : "low";
}

function spanOf(rir: number | Range): Range {
  return typeof rir === "number" ? { min: rir, max: rir } : rir;
}

function EffortPill({
  tone,
  children,
}: {
  tone: EffortTone;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-w-[1lh] items-center justify-center rounded-full px-1.5 font-semibold whitespace-nowrap tabular-nums",
        TONE_CLASS[tone],
      )}
    >
      {children}
    </span>
  );
}

export function RirValue({ rir }: { rir: number | Range }): ReactNode {
  const span = spanOf(rir);

  return <EffortPill tone={effortOf(span.min)}>{formatRange(span)}</EffortPill>;
}
