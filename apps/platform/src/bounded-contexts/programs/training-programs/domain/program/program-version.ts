import type { Block, ProgramContent, Session } from "./program-content";
import type { BlockType, VersionStatus } from "./vocabulary";

export type ProgramVersionSnapshot = {
  number: number;
  status: VersionStatus;
  content: ProgramContent;
  createdAt: Date;
  updatedAt: Date;
};

type BlockSummary = {
  type: BlockType;
  weeks: number;
  filledSessions: number;
  sessions: number;
};

type DraftGap = { kind: "sessions-without-exercises"; count: number };

export type DraftSummary = {
  versionNumber: number;
  blocks: BlockSummary[];
  stillMissing: DraftGap[];
};

type FirstDraftInput = { content: ProgramContent; at: Date };

export class ProgramVersion {
  private constructor(private readonly snapshot: ProgramVersionSnapshot) {}

  static firstDraft({ content, at }: FirstDraftInput): ProgramVersion {
    return new ProgramVersion({
      number: 1,
      status: "draft",
      content,
      createdAt: at,
      updatedAt: at,
    });
  }

  static reconstitute(stored: ProgramVersionSnapshot): ProgramVersion {
    return new ProgramVersion(stored);
  }

  get isDraft(): boolean {
    return this.snapshot.status === "draft";
  }

  summary(): DraftSummary {
    const blocks = this.snapshot.content.plan.blocks.map(
      (block): BlockSummary => ({
        type: block.type,
        weeks: block.weeks,
        filledSessions: this.filledSessionCount(block),
        sessions: block.sessions.length,
      }),
    );
    const sessionsWithoutExercises = blocks.reduce(
      (sum, block) => sum + block.sessions - block.filledSessions,
      0,
    );

    return {
      versionNumber: this.snapshot.number,
      blocks,
      stillMissing:
        sessionsWithoutExercises > 0
          ? [
              {
                kind: "sessions-without-exercises",
                count: sessionsWithoutExercises,
              },
            ]
          : [],
    };
  }

  toSnapshot(): ProgramVersionSnapshot {
    return { ...this.snapshot };
  }

  private filledSessionCount(block: Block): number {
    return block.sessions.filter((session) => this.hasExercises(session))
      .length;
  }

  private hasExercises(session: Session): boolean {
    return session.rows.some((row) => row.exerciseId !== "");
  }
}
