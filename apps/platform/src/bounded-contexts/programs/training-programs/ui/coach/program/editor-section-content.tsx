import type { LibraryTarget } from "~/bounded-contexts/programs/training-programs/public/program-editing";

import { BlockWorkspace } from "./block-workspace";
import { PlanOverview } from "./plan-overview";
import { ProgramSettings } from "./program-settings";
import type { BuilderState } from "./use-builder-state";

export type SessionOpening = {
  openSessionId: string | undefined;
  onOpenSession: (sessionId: string) => void;
  onOpenLibrary: (target: LibraryTarget) => void;
  libraryTarget: LibraryTarget | null;
};

type EditorSectionContentProps = {
  builder: BuilderState;
  sessionOpening: SessionOpening;
  onAddBlock: () => void;
};

export function EditorSectionContent({
  builder,
  sessionOpening,
  onAddBlock,
}: EditorSectionContentProps) {
  const { draft, selected } = builder;
  const { blocks } = draft.content.plan;

  if (selected.kind === "plan") {
    return (
      <PlanOverview
        content={draft.content}
        level={draft.level}
        libraryExercises={builder.libraryExercises}
        onAddBlock={onAddBlock}
        onChange={builder.updateBlocks}
        onOpenBlock={(blockId) => builder.select({ kind: "block", blockId })}
        onUseSuggestion={builder.applySuggestion}
        settings={
          <ProgramSettings
            language={draft.language}
            level={draft.level}
            onChange={builder.changeSettings}
          />
        }
      />
    );
  }

  const index = blocks.findIndex((block) => block.id === selected.blockId);
  const block = blocks[index];

  return (
    <BlockWorkspace
      block={block}
      blockIndex={index}
      blocks={blocks}
      language={draft.language}
      level={draft.level}
      libraryEquipment={builder.libraryEquipment}
      libraryExercises={builder.libraryExercises}
      libraryTarget={sessionOpening.libraryTarget}
      onChange={builder.replaceBlock}
      onOpenLibrary={sessionOpening.onOpenLibrary}
      onOpenSession={sessionOpening.onOpenSession}
      onRemove={() => builder.removeBlock(block.id)}
      openSessionId={sessionOpening.openSessionId}
    />
  );
}
