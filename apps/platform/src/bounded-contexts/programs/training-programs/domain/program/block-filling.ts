import type { Block, Session } from "./program-content";

export class BlockFilling {
  static filledSessionCount(block: Block): number {
    return block.sessions.filter(BlockFilling.hasExercises).length;
  }

  private static hasExercises(session: Session): boolean {
    return session.rows.some((row) => row.exerciseId !== "");
  }
}
