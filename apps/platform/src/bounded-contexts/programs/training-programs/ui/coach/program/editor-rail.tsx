import { cn, EYEBROW_CLASS } from "~/shared/design-system/lib";
import { Button } from "~/shared/design-system/primitives";
import { cva } from "class-variance-authority";
import { AlertCircle, GanttChart, Plus } from "lucide-react";
import { useId, type ReactNode } from "react";

import {
  BLOCK_TYPE_LABELS,
  BlockFilling,
  PlanSequence,
  type Block,
} from "~/bounded-contexts/programs/training-programs/public/program-editing";

import { BlockNumber } from "./block-number";
import { isSameSection, OVERVIEW, type EditorSection } from "./editor-section";
import { PlanStrip } from "./plan-timeline";
import { blockSpan } from "./plan-weeks";

type EditorRailProps = {
  blocks: readonly Block[];
  selected: EditorSection;
  onSelect: (section: EditorSection) => void;
  onAddBlock: () => void;
};

type Detail = { text: string; tone: "muted" | "warning" };

const railEntryVariants = cva(
  "w-full rounded-card border text-left text-sm transition-colors",
  {
    variants: {
      state: {
        idle: "border-control-border-soft bg-surface-base hover:bg-surface-quiet",
        current: "border-text-primary bg-surface-quiet shadow-card",
      },
    },
  },
);

function counted(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function weekSpanText(blocks: readonly Block[], index: number): string {
  const { startWeek, endWeek } = blockSpan(blocks, index);

  return startWeek === endWeek
    ? `week ${startWeek}`
    : `weeks ${startWeek}–${endWeek}`;
}

function detailsOf(blocks: readonly Block[], index: number): Detail[] {
  const block = blocks[index];
  const empty = block.sessions.length - BlockFilling.filledSessionCount(block);
  const weeks: Detail = { text: weekSpanText(blocks, index), tone: "muted" };

  return empty > 0
    ? [weeks, { text: `${counted(empty, "session")} empty`, tone: "warning" }]
    : [weeks];
}

function blocksWithProblems(blocks: readonly Block[]): Set<string> {
  return new Set(
    PlanSequence.problemsOf(blocks).map((problem) => problem.blockId),
  );
}

function DetailLine({ detail }: { detail: Detail }) {
  return (
    <span
      className={cn("text-xs", {
        "text-text-secondary": detail.tone === "muted",
        "text-feedback-warning": detail.tone === "warning",
      })}
    >
      {` ${detail.text}`}
    </span>
  );
}

function ProblemMark() {
  return (
    <span className="text-feedback-danger" data-parity="problem-mark">
      <AlertCircle aria-hidden="true" size={16} />
      <span className="sr-only"> has a problem</span>
    </span>
  );
}

function RailGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const titleId = useId();

  return (
    <div className="grid gap-2">
      <p className={cn(EYEBROW_CLASS, "px-3")} id={titleId}>
        {title}
      </p>
      <ul aria-labelledby={titleId} className="grid gap-3">
        {children}
      </ul>
    </div>
  );
}

type BlockEntryProps = {
  blocks: readonly Block[];
  index: number;
  problem: boolean;
  current: boolean;
  onClick: () => void;
};

function BlockEntry({
  blocks,
  index,
  problem,
  current,
  onClick,
}: BlockEntryProps) {
  const block = blocks[index];

  return (
    <li>
      <button
        aria-current={current ? "true" : undefined}
        className={cn(
          railEntryVariants({ state: current ? "current" : "idle" }),
          "grid gap-0.5 px-3 py-2",
        )}
        data-parity={`rail-block-${index + 1}`}
        onClick={onClick}
        type="button"
      >
        <span
          className={cn("flex items-center gap-2 text-text-primary", {
            "font-medium": current,
          })}
        >
          <BlockNumber
            block={block}
            index={index}
            parity={`rail-block-${index + 1}-number`}
            size="xs"
          />
          <span
            className="sr-only"
            data-parity={`rail-block-${index + 1}-spoken-number`}
          >{`${index + 1} `}</span>
          {BLOCK_TYPE_LABELS[block.type]}
          {problem && <ProblemMark />}
        </span>
        {detailsOf(blocks, index).map((detail) => (
          <DetailLine detail={detail} key={detail.text} />
        ))}
      </button>
    </li>
  );
}

export function EditorRail({
  blocks,
  selected,
  onSelect,
  onAddBlock,
}: EditorRailProps) {
  const overviewCurrent = isSameSection(OVERVIEW, selected);
  const flagged = blocksWithProblems(blocks);

  return (
    <div className="grid content-start gap-6 p-3" data-parity-root="EditorRail">
      <nav aria-label="Program sections" className="grid content-start gap-6">
        <button
          aria-current={overviewCurrent ? "true" : undefined}
          className={cn(
            railEntryVariants({ state: overviewCurrent ? "current" : "idle" }),
            "grid gap-2.5 p-3",
          )}
          data-parity="rail-overview"
          onClick={() => onSelect(OVERVIEW)}
          type="button"
        >
          <span
            className={cn("flex items-center gap-2 text-text-primary", {
              "font-semibold": overviewCurrent,
              "font-medium": !overviewCurrent,
            })}
          >
            <GanttChart aria-hidden="true" size={18} />
            Overview
          </span>
          <PlanStrip blocks={blocks} />
        </button>
        <RailGroup title="Blocks">
          {blocks.map((block, index) => {
            const section: EditorSection = { kind: "block", blockId: block.id };

            return (
              <BlockEntry
                blocks={blocks}
                current={isSameSection(section, selected)}
                index={index}
                key={block.id}
                onClick={() => onSelect(section)}
                problem={flagged.has(block.id)}
              />
            );
          })}
          <li>
            <Button
              className="w-full justify-start has-[>svg]:px-4"
              onClick={onAddBlock}
              size="sm"
              variant="ghost"
            >
              <Plus aria-hidden="true" size={16} />
              Add block
            </Button>
          </li>
        </RailGroup>
      </nav>
    </div>
  );
}
