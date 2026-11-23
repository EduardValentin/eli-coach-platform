import { cn } from "~/shared/design-system/lib";
import { useRef, useState, type KeyboardEvent } from "react";

import {
  BLOCK_TYPE_LABELS,
  type Block,
  type BlockType,
} from "~/bounded-contexts/programs/training-programs/public/program-editing";

import { BLOCK_RULE, BlockNumber } from "./block-number";
import { blockSpan } from "./plan-weeks";
import { useContainerWidthRem } from "./use-container-width-rem";

const ROW_CELL_MIN_REM = 3.5;
const NO_DATE = " ";

const BLOCK_SOFT: Record<BlockType, string> = {
  foundation: "bg-training-foundation-soft",
  hypertrophy: "bg-training-hypertrophy-soft",
  strength: "bg-training-strength-soft",
  deload: "bg-training-deload-soft",
};

const BLOCK_SWATCH: Record<BlockType, string> = {
  foundation: "bg-training-foundation",
  hypertrophy: "bg-training-hypertrophy",
  strength: "bg-training-strength",
  deload: "bg-training-deload",
};

type Layout = "row" | "stacked";

type TimelineWeek = {
  weekOfPlan: number;
  weekOfBlock: number;
  totalWeeks: number;
  blockIndex: number;
  block: Block;
};

function timelineWeeks(blocks: readonly Block[]): TimelineWeek[][] {
  const totalWeeks = blocks.reduce((total, block) => total + block.weeks, 0);

  return blocks.map((block, blockIndex) => {
    const { startWeek } = blockSpan(blocks, blockIndex);

    return Array.from({ length: block.weeks }, (_, offset) => ({
      weekOfPlan: startWeek + offset,
      weekOfBlock: offset + 1,
      totalWeeks,
      blockIndex,
      block,
    }));
  });
}

function weekCellName(week: TimelineWeek): string {
  const name = BLOCK_TYPE_LABELS[week.block.type];
  const ofBlock =
    week.block.weeks === 1
      ? name
      : `${name} week ${week.weekOfBlock} of ${week.block.weeks}`;

  return `Week ${week.weekOfPlan} of ${week.totalWeeks}, ${ofBlock}, open block`;
}

function useTimelineLayout(weeks: number) {
  const { ref, widthRem } = useContainerWidthRem<HTMLDivElement>();
  const fitsRow = widthRem > 0 && widthRem / weeks >= ROW_CELL_MIN_REM;
  const layout: Layout = fitsRow ? "row" : "stacked";

  return { ref, layout };
}

type WeekCellProps = {
  week: TimelineWeek;
  tabStop: boolean;
  cellRef: (element: HTMLButtonElement | null) => void;
  onFocus: () => void;
  onOpen: () => void;
};

function WeekCell({ week, tabStop, cellRef, onFocus, onOpen }: WeekCellProps) {
  return (
    <button
      aria-label={weekCellName(week)}
      className={cn(
        "relative hit-area flex w-full min-h-13 flex-col justify-between rounded-field border border-control-border-soft px-1.5 py-2 text-left text-text-primary tabular-nums",
        BLOCK_SOFT[week.block.type],
      )}
      data-parity="plan-week"
      data-week={week.weekOfPlan}
      onClick={onOpen}
      onFocus={onFocus}
      ref={cellRef}
      tabIndex={tabStop ? 0 : -1}
      type="button"
    >
      <span
        aria-hidden="true"
        className="flex items-baseline gap-1.5 text-base font-medium"
        data-parity="plan-week-number"
      >
        {week.weekOfPlan}
      </span>
      <span
        aria-hidden="true"
        className="text-caption font-medium whitespace-nowrap"
        data-parity="plan-week-date"
      >
        {NO_DATE}
      </span>
    </button>
  );
}

type BlockHeadProps = { block: Block; index: number; layout: Layout };

function BlockHead({ block, index, layout }: BlockHeadProps) {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-x-2 gap-y-0.5 pb-2", {
        "border-t-3 pt-2": layout === "row",
        [BLOCK_RULE[block.type]]: layout === "row",
      })}
      data-parity="plan-block-head"
    >
      <span className="flex min-w-0 items-center gap-2 whitespace-nowrap">
        <BlockNumber block={block} index={index} size="xs" />
        <span
          className={cn("min-w-0 font-semibold text-text-primary", {
            "text-sm": layout === "row",
            "text-base": layout === "stacked",
          })}
        >
          {BLOCK_TYPE_LABELS[block.type]}
        </span>
      </span>
      {block.weeks > 1 && (
        <span
          className="basis-full text-sm text-text-secondary tabular-nums"
          data-parity="plan-block-span"
        >
          <span className="whitespace-nowrap">{`${block.weeks} weeks`}</span>
        </span>
      )}
    </div>
  );
}

function weekReachedByKey(
  key: string,
  week: number,
  total: number,
): number | null {
  if (key === "ArrowRight") return Math.min(week + 1, total);
  if (key === "ArrowLeft") return Math.max(week - 1, 1);
  if (key === "Home") return 1;

  return key === "End" ? total : null;
}

type PlanTimelineProps = {
  blocks: readonly Block[];
  onOpenBlock: (blockIndex: number) => void;
};

export function PlanTimeline({ blocks, onOpenBlock }: PlanTimelineProps) {
  const byBlock = timelineWeeks(blocks);
  const totalWeeks = byBlock.flat().length;
  const { ref, layout } = useTimelineLayout(totalWeeks);
  const [tabWeek, setTabWeek] = useState(1);
  const cells = useRef(new Map<number, HTMLButtonElement>());

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const week = Number((event.target as HTMLElement).dataset.week);
    if (!week) return;
    const next = weekReachedByKey(event.key, week, totalWeeks);
    if (next === null) return;
    event.preventDefault();
    cells.current.get(next)?.focus();
  }

  return (
    <div className="grid gap-3" data-parity="plan-timeline" ref={ref}>
      <div aria-label="Plan weeks" onKeyDown={onKeyDown} role="toolbar">
        <ol
          aria-label="Plan blocks"
          className={cn({
            "flex gap-1": layout === "row",
            "grid gap-4": layout === "stacked",
          })}
        >
          {byBlock.map((weeks, index) => {
            const block = blocks[index];

            return (
              <li
                className={cn({ "flex flex-col": layout === "row" })}
                data-parity="plan-block"
                key={block.id}
                style={
                  layout === "row"
                    ? { flexGrow: block.weeks, flexBasis: 0 }
                    : undefined
                }
              >
                <BlockHead block={block} index={index} layout={layout} />
                <ol
                  aria-label={`${BLOCK_TYPE_LABELS[block.type]} weeks`}
                  className={cn("grid gap-1", {
                    "grid-cols-[repeat(auto-fill,minmax(3.5rem,1fr))] gap-1.5":
                      layout === "stacked",
                    "mt-auto": layout === "row",
                  })}
                  style={
                    layout === "row"
                      ? {
                          gridTemplateColumns: `repeat(${block.weeks}, minmax(0, 1fr))`,
                        }
                      : undefined
                  }
                >
                  {weeks.map((week) => (
                    <li
                      className="grid"
                      data-parity="plan-week-item"
                      key={week.weekOfPlan}
                    >
                      <WeekCell
                        cellRef={(element) => {
                          if (element)
                            cells.current.set(week.weekOfPlan, element);
                          else cells.current.delete(week.weekOfPlan);
                        }}
                        onFocus={() => setTabWeek(week.weekOfPlan)}
                        onOpen={() => onOpenBlock(week.blockIndex)}
                        tabStop={tabWeek === week.weekOfPlan}
                        week={week}
                      />
                    </li>
                  ))}
                </ol>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

export function PlanStrip({ blocks }: { blocks: readonly Block[] }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-1.5 gap-0.5"
      data-parity="plan-strip"
    >
      {blocks.map((block) => (
        <span
          className={cn("rounded-full", BLOCK_SWATCH[block.type])}
          data-parity="plan-strip-segment"
          key={block.id}
          style={{ flexGrow: block.weeks, flexBasis: 0 }}
        />
      ))}
    </span>
  );
}
