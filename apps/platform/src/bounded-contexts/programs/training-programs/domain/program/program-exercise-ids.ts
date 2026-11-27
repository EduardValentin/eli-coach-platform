import type {
  Block,
  CardioSession,
  ProgramContent,
  Session,
} from "./program-content";

/** The exercises one content uses: in a row, a substitution, the warm-up, the cool-down (also while it is off) or a cardio segment. */
export class ProgramExerciseIds {
  static usedBy(content: ProgramContent): string[] {
    const ids = content.plan.blocks.flatMap(ProgramExerciseIds.ofBlock);

    return [...new Set(ids.filter((id) => id !== ""))];
  }

  private static ofBlock(block: Block): string[] {
    return [
      ...block.sessions.flatMap(ProgramExerciseIds.ofSession),
      ...block.cardioSessions.flatMap(ProgramExerciseIds.ofCardio),
    ];
  }

  private static ofSession(session: Session): string[] {
    return [
      ...session.warmUp.items.map((item) => item.exerciseId),
      ...session.coolDown.items.map((item) => item.exerciseId),
      ...session.rows.flatMap((row) => [row.exerciseId, ...row.substitutions]),
    ];
  }

  private static ofCardio(cardio: CardioSession): string[] {
    return cardio.segments.map((segment) => segment.exerciseId);
  }
}
