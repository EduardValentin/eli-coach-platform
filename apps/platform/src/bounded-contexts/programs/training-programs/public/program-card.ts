import {
  BLOCK_TYPE_LABELS,
  type BlockType,
  type ClientGender,
  type DraftSummary,
} from "~/bounded-contexts/programs/training-programs/domain/program";

type ProgramCardBlock = {
  type: BlockType;
  typeLabel: string;
  weeks: number;
  filledSessions: number;
  sessions: number;
};

type ProgramCardDraft = {
  versionNumber: number;
  blocks: ProgramCardBlock[];
};

export type ProgramCardView =
  | {
      state: "waiting" | "ready-to-build" | "coaching-ended";
      gender: ClientGender;
    }
  | {
      state: "draft";
      gender: ClientGender;
      draft: ProgramCardDraft;
      stillMissing: string[];
    }
  | {
      state: "draft-coaching-ended";
      gender: ClientGender;
      draft: ProgramCardDraft;
    };

export function presentProgramCardDraft({
  versionNumber,
  blocks,
}: DraftSummary): ProgramCardDraft {
  return {
    versionNumber,
    blocks: blocks.map((block) => ({
      ...block,
      typeLabel: BLOCK_TYPE_LABELS[block.type],
    })),
  };
}

export function presentStillMissing({ stillMissing }: DraftSummary): string[] {
  return stillMissing.map(
    ({ count }) =>
      `${count} ${count === 1 ? "session" : "sessions"} without exercises`,
  );
}
