import { cn } from "~/shared/design-system/lib";

import type { BlockType } from "~/bounded-contexts/programs/training-programs/public/program-editing";

type BlockNumberSize = "xs" | "sm" | "md";

type BlockNumberProps = {
  block: { type: BlockType };
  index: number;
  size: BlockNumberSize;
};

const SIZE_CLASS: Record<BlockNumberSize, string> = {
  xs: "size-5.5 text-xs leading-none",
  sm: "size-7 text-xs",
  md: "size-8 text-sm",
};

export const BLOCK_RULE: Record<BlockType, string> = {
  foundation: "border-training-foundation",
  hypertrophy: "border-training-hypertrophy",
  strength: "border-training-strength",
  deload: "border-training-deload",
};

export function BlockNumber({ block, index, size }: BlockNumberProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-tile border-2 bg-surface-base font-semibold text-text-primary tabular-nums",
        SIZE_CLASS[size],
        BLOCK_RULE[block.type],
      )}
    >
      {index + 1}
    </span>
  );
}
