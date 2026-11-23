import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router";

import type { ProgramDraftView } from "~/bounded-contexts/programs/training-programs/public/program-draft";
import {
  ProgramSuggestions,
  type Block,
  type BlockSetup,
  type BlockType,
  type ClientLevel,
  type ProgramLanguage,
} from "~/bounded-contexts/programs/training-programs/public/program-editing";

import { newBuilderId } from "./builder-editing";
import {
  OVERVIEW,
  sectionFromHash,
  sectionHash,
  type EditorSection,
} from "./editor-section";
import type { BlocksUpdate } from "./plan-block-list";
import { useAutosavedDraft, type BuilderDraft } from "./use-autosaved-draft";

export type DraftView = Extract<ProgramDraftView, { state: "draft" }>;

type SettingsPatch = { level?: ClientLevel; language?: ProgramLanguage };

function blockSetupOf(view: DraftView, draft: BuilderDraft): BlockSetup {
  return {
    ...view.blockSetup,
    language: draft.language,
    splitShape:
      draft.content.plan.blocks[0]?.split.shape ?? view.blockSetup.splitShape,
  };
}

export function useBuilderState(view: DraftView) {
  const { draft, change, saving } = useAutosavedDraft({
    clientId: view.client.clientId,
    content: view.content,
    level: view.level,
    language: view.language,
    updatedAt: view.updatedAt,
  });
  const location = useLocation();
  const navigate = useNavigate();
  const programSuggestions = useMemo(
    () =>
      new ProgramSuggestions({
        cardioExercises: view.cardioExercises,
        newId: newBuilderId,
      }),
    [view.cardioExercises],
  );
  const { blocks } = draft.content.plan;
  const selected = sectionFromHash(location.hash, blocks);

  function select(section: EditorSection) {
    navigate(
      { search: location.search, hash: sectionHash(section) },
      { replace: true },
    );
  }

  function updateBlocks(update: BlocksUpdate) {
    change((current) => ({
      ...current,
      content: {
        ...current.content,
        plan: { blocks: update(current.content.plan.blocks) },
      },
    }));
  }

  function changeSettings(patch: SettingsPatch) {
    change((current) => ({ ...current, ...patch }));
  }

  function replaceBlock(block: Block) {
    updateBlocks((current) =>
      current.map((other) => (other.id === block.id ? block : other)),
    );
  }

  function addBlock(type: BlockType, weeks: number) {
    const block = programSuggestions.newBlock(type, weeks, {
      setup: blockSetupOf(view, draft),
      previous: blocks.at(-1),
    });
    updateBlocks((current) => [...current, block]);
    select({ kind: "block", blockId: block.id });
  }

  function removeBlock(blockId: string) {
    updateBlocks((current) => current.filter((block) => block.id !== blockId));
    select(OVERVIEW);
  }

  function applySuggestion() {
    const suggested = programSuggestions.initialContent({
      ...blockSetupOf(view, draft),
      level: draft.level,
    });
    updateBlocks(() => suggested.plan.blocks);
  }

  return {
    draft,
    saving,
    selected,
    select,
    updateBlocks,
    changeSettings,
    replaceBlock,
    addBlock,
    removeBlock,
    applySuggestion,
  };
}

export type BuilderState = ReturnType<typeof useBuilderState>;
