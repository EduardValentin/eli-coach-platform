import { Button } from "~/shared/design-system/primitives";
import type { ReactNode } from "react";

import {
  BLOCK_TYPE_LABELS,
  PlanSequence,
  ProgramSuggestions,
  type Block,
  type ClientLevel,
  type LibraryExercise,
  type ProgramContent,
} from "~/bounded-contexts/programs/training-programs/public/program-editing";

import { PlanBlockList, type BlocksUpdate } from "./plan-block-list";
import { usePlaceHeading } from "./place-heading";
import { PlanTimeline } from "./plan-timeline";
import { weeksText } from "./plan-weeks";

type PlanOverviewProps = {
  content: ProgramContent;
  level: ClientLevel;
  libraryExercises: readonly LibraryExercise[];
  onChange: (update: BlocksUpdate) => void;
  onOpenBlock: (blockId: string) => void;
  onAddBlock: () => void;
  onUseSuggestion: () => void;
  settings: ReactNode;
};

const CLIENT_OF_LEVEL: Record<ClientLevel, string> = {
  beginner: "a beginner client",
  intermediate: "an intermediate client",
  advanced: "an advanced client",
};

function SuggestionBanner({
  level,
  onUse,
}: {
  level: ClientLevel;
  onUse: () => void;
}) {
  const placeHeading = usePlaceHeading();
  const plan = ProgramSuggestions.suggestedBlocks(level)
    .map(
      (block) => `${BLOCK_TYPE_LABELS[block.type]} ${weeksText(block.weeks)}`,
    )
    .join(" → ");

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border-default bg-surface-base p-4"
      data-parity="suggestion-banner"
    >
      <p className="text-sm text-text-primary">{`Suggested for ${CLIENT_OF_LEVEL[level]}: ${plan}`}</p>
      <Button
        onClick={() => {
          onUse();
          placeHeading.current?.focus();
        }}
        size="sm"
      >
        Use suggestion
      </Button>
    </div>
  );
}

function problemsByBlock(blocks: readonly Block[]): Map<string, string[]> {
  const byBlock = new Map<string, string[]>();
  for (const problem of PlanSequence.problemsOf(blocks)) {
    byBlock.set(problem.blockId, [
      ...(byBlock.get(problem.blockId) ?? []),
      PlanSequence.messageOf(problem),
    ]);
  }

  return byBlock;
}

export function PlanOverview({
  content,
  level,
  libraryExercises,
  onChange,
  onOpenBlock,
  onAddBlock,
  onUseSuggestion,
  settings,
}: PlanOverviewProps) {
  const { blocks } = content.plan;

  return (
    <section className="grid grid-cols-1 gap-6" data-parity-root="PlanOverview">
      <div
        className="flex flex-wrap items-center gap-x-6 gap-y-3"
        data-parity="plan-overview-settings"
      >
        <h2 className="sr-only">Plan overview</h2>
        {settings}
      </div>
      {blocks.length === 0 ? (
        <SuggestionBanner level={level} onUse={onUseSuggestion} />
      ) : (
        <>
          <PlanTimeline
            blocks={blocks}
            onOpenBlock={(blockIndex) => onOpenBlock(blocks[blockIndex].id)}
          />
          <PlanBlockList
            blocks={blocks}
            level={level}
            libraryExercises={libraryExercises}
            onAddBlock={onAddBlock}
            onChange={onChange}
            onOpenBlock={onOpenBlock}
            problems={problemsByBlock(blocks)}
          />
        </>
      )}
    </section>
  );
}
