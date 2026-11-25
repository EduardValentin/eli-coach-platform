import type { Equipment, LibraryExercise } from "./library-exercise";
import type { LibraryTarget } from "./library-target";
import { CoolDownEditing } from "./cool-down-editing";
import { SINGLE_UNIT_SLOTS, type Block, type Session } from "./program-content";
import { SessionEditing } from "./session-editing";
import { SplitTemplate } from "./split-template";
import { SLOTS, type Slot } from "./vocabulary";
import { WarmUpEditing } from "./warm-up-editing";

export type LibraryPick = {
  exercise: LibraryExercise;
  target: LibraryTarget | null;
  openSessionId: string | undefined;
};

type LibraryPicksOptions = {
  newId: () => string;
  libraryExercises: readonly LibraryExercise[];
  equipment: readonly Equipment[];
};

const FALLBACK_SLOT: Slot = "C";

/** An exercise picked in the library lands on its target, or without one by its type (Business Rule 35). */
export class LibraryPicks {
  private readonly warmUpEditing: WarmUpEditing;
  private readonly coolDownEditing: CoolDownEditing;

  constructor(private readonly options: LibraryPicksOptions) {
    this.warmUpEditing = new WarmUpEditing(options);
    this.coolDownEditing = new CoolDownEditing(options);
  }

  /** The first slot group whose planned patterns fit the exercise and that has room, otherwise Accessories. */
  static quickAddSlot(
    block: Block,
    session: Session,
    exercise: LibraryExercise,
  ): Slot {
    const matching = SLOTS.find((slot) => {
      const plan = SplitTemplate.slotPlanFor(block, session, slot);
      const fits =
        exercise.pattern !== null && plan?.patterns.includes(exercise.pattern);
      const taken =
        SINGLE_UNIT_SLOTS.includes(slot) &&
        session.rows.some((row) => row.slot === slot);

      return fits && !taken;
    });

    return matching ?? FALLBACK_SLOT;
  }

  blockWithLibraryPick(block: Block, pick: LibraryPick): Block {
    const sessionId = pick.target?.sessionId ?? pick.openSessionId;

    return {
      ...block,
      sessions: block.sessions.map((session) =>
        session.id === sessionId
          ? this.pickedSession(block, session, pick)
          : session,
      ),
    };
  }

  private pickedSession(
    block: Block,
    session: Session,
    { exercise, target }: LibraryPick,
  ): Session {
    const sessionEditing = new SessionEditing({
      ...this.options,
      blockType: block.type,
    });
    if (target?.kind === "substitution") {
      return sessionEditing.addSubstitution(session, target.rowId, exercise.id);
    }
    if (target?.kind === "warm-up" || exercise.type === "mobility") {
      return this.warmUpEditing.add(session, exercise.id);
    }
    if (target?.kind === "cool-down" || exercise.type === "stretching") {
      return this.coolDownEditing.add(session, exercise.id);
    }
    const slot =
      target?.kind === "slot"
        ? target.slot
        : LibraryPicks.quickAddSlot(block, session, exercise);

    return sessionEditing.add(session, exercise, { slot });
  }
}
