import { BlockFilling } from "./block-filling";
import { BlockWeeks } from "./block-weeks";
import {
  MAX_SUBSTITUTIONS,
  MAX_WARM_UP_ITEMS,
  SINGLE_UNIT_SLOTS,
  type Block,
  type ExerciseRow,
  type ProgramContent,
  type Session,
} from "./program-content";
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

export type DraftReading = {
  versionNumber: number;
  content: ProgramContent;
  updatedAt: Date;
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

  static isWellFormed(content: ProgramContent): boolean {
    return content.plan.blocks.every(
      (block) =>
        BlockWeeks.isAllowed(block.type, block.weeks) &&
        ProgramVersion.calendarNamesItsOwnDays(block) &&
        block.sessions.every(ProgramVersion.isSessionWellFormed),
    );
  }

  get isDraft(): boolean {
    return this.snapshot.status === "draft";
  }

  get isFirst(): boolean {
    return this.snapshot.number === 1;
  }

  draftReading(): DraftReading {
    const { number, content, updatedAt } = this.snapshot;

    return { versionNumber: number, content, updatedAt };
  }

  withContent(content: ProgramContent, at: Date): ProgramVersion {
    return new ProgramVersion({ ...this.snapshot, content, updatedAt: at });
  }

  summary(): DraftSummary {
    const blocks = this.snapshot.content.plan.blocks.map(
      (block): BlockSummary => ({
        type: block.type,
        weeks: block.weeks,
        filledSessions: BlockFilling.filledSessionCount(block),
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

  private static isSessionWellFormed(session: Session): boolean {
    const { warmUp, coolDown, rows } = session;

    return (
      SINGLE_UNIT_SLOTS.every(
        (slot) => rows.filter((row) => row.slot === slot).length <= 1,
      ) &&
      rows.every(ProgramVersion.isRowWellFormed) &&
      warmUp.items.length <= MAX_WARM_UP_ITEMS &&
      ProgramVersion.hasNoRepeats(warmUp.items) &&
      ProgramVersion.hasNoRepeats(coolDown.items)
    );
  }

  private static isRowWellFormed(row: ExerciseRow): boolean {
    const supersetInPlace =
      row.supersetGroup === undefined || !SINGLE_UNIT_SLOTS.includes(row.slot);

    return (
      supersetInPlace &&
      row.substitutions.length <= MAX_SUBSTITUTIONS &&
      !row.substitutions.includes(row.exerciseId)
    );
  }

  private static hasNoRepeats(
    items: readonly { exerciseId: string }[],
  ): boolean {
    return new Set(items.map((item) => item.exerciseId)).size === items.length;
  }

  private static calendarNamesItsOwnDays(block: Block): boolean {
    const sessionIds = new Set(block.sessions.map((session) => session.id));
    const cardioIds = new Set(block.cardioSessions.map((cardio) => cardio.id));

    return Object.values(block.calendar).every((entry) => {
      if (entry.kind === "session") return sessionIds.has(entry.sessionId);
      if (entry.kind === "cardio") return cardioIds.has(entry.cardioId);

      return true;
    });
  }
}
