import type { Block } from "~/bounded-contexts/programs/training-programs/public/program-editing";

export function weeksText(weeks: number): string {
  return `${weeks} ${weeks === 1 ? "week" : "weeks"}`;
}

export type WeekSpan = { startWeek: number; endWeek: number };

export function blockSpan(
  blocks: readonly Pick<Block, "weeks">[],
  index: number,
): WeekSpan {
  const startWeek =
    blocks.slice(0, index).reduce((total, block) => total + block.weeks, 0) + 1;

  return { startWeek, endWeek: startWeek + blocks[index].weeks - 1 };
}
