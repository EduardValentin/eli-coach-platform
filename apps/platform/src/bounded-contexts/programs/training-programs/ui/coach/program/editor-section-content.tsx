import { BlockWorkspace } from "./block-workspace";
import { PlanOverview } from "./plan-overview";
import { ProgramSettings } from "./program-settings";
import type { BuilderState } from "./use-builder-state";

type EditorSectionContentProps = {
  builder: BuilderState;
  onAddBlock: () => void;
};

export function EditorSectionContent({
  builder,
  onAddBlock,
}: EditorSectionContentProps) {
  const { draft, selected } = builder;
  const { blocks } = draft.content.plan;

  if (selected.kind === "plan") {
    return (
      <PlanOverview
        content={draft.content}
        level={draft.level}
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
      onChange={builder.replaceBlock}
      onRemove={() => builder.removeBlock(block.id)}
    />
  );
}
