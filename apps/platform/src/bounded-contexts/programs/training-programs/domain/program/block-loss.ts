import type { Block, CardioSession, Session } from "./program-content";
import { SplitTemplate } from "./split-template";
import type { TrainingDays, Weekday } from "./vocabulary";

export type LossChange =
  | { kind: "split" }
  | { kind: "reset" }
  | { kind: "training-days"; days: TrainingDays }
  | { kind: "day"; weekday: Weekday }
  | { kind: "clear-session"; sessionId: string }
  | { kind: "remove-block" };

export class BlockLoss {
  static describe(block: Block, change: LossChange): string[] {
    switch (change.kind) {
      case "day":
        return BlockLoss.lostOnDay(block, change.weekday);
      case "training-days":
        return BlockLoss.lostToTrainingDays(block, change.days);
      case "clear-session":
        return block.sessions
          .filter((session) => session.id === change.sessionId)
          .flatMap(BlockLoss.sessionLoss);
      case "remove-block":
        return [
          ...block.sessions.flatMap(BlockLoss.sessionLoss),
          ...block.cardioSessions.flatMap(BlockLoss.cardioLoss),
        ];
      case "split":
      case "reset":
        return block.sessions.flatMap(BlockLoss.sessionLoss);
    }
  }

  private static lostToTrainingDays(
    block: Block,
    days: TrainingDays,
  ): string[] {
    const kept = new Set(
      SplitTemplate.cardioFitting(block.cardioSessions, days),
    );

    return [
      ...block.sessions.slice(days).flatMap(BlockLoss.sessionLoss),
      ...block.cardioSessions
        .filter((cardio) => !kept.has(cardio))
        .flatMap(BlockLoss.cardioLoss),
    ];
  }

  private static lostOnDay(block: Block, weekday: Weekday): string[] {
    const entry = block.calendar[weekday];

    if (entry.kind === "session") {
      return block.sessions
        .filter((session) => session.id === entry.sessionId)
        .flatMap(BlockLoss.sessionLoss);
    }
    if (entry.kind === "cardio") {
      return block.cardioSessions
        .filter((cardio) => cardio.id === entry.cardioId)
        .flatMap(BlockLoss.cardioLoss);
    }

    return [];
  }

  private static sessionLoss(session: Session): string[] {
    const exercises = session.rows.filter(
      (row) => row.exerciseId !== "",
    ).length;

    return exercises > 0
      ? [`${session.name} · ${BlockLoss.counted(exercises, "exercise")}`]
      : [];
  }

  private static cardioLoss(cardio: CardioSession): string[] {
    const segments = cardio.segments.length;

    return segments > 0
      ? [`${cardio.name} · ${BlockLoss.counted(segments, "segment")}`]
      : [];
  }

  private static counted(count: number, noun: string): string {
    return `${count} ${noun}${count === 1 ? "" : "s"}`;
  }
}
