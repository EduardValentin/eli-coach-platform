import type { Equipment, LibraryExercise } from "./library-exercise";
import type { LibraryTarget } from "./library-target";
import { CoolDownEditing, type CoolDownRefusal } from "./cool-down-editing";
import { SINGLE_UNIT_SLOTS, type Block, type Session } from "./program-content";
import { SessionEditing, type SubstitutionRefusal } from "./session-editing";
import { SplitTemplate } from "./split-template";
import { SLOTS, type Slot } from "./vocabulary";
import { WarmUpEditing, type WarmUpRefusal } from "./warm-up-editing";

export type LibraryPick = {
  exercise: LibraryExercise;
  target: LibraryTarget | null;
  openSessionId: string | undefined;
};

export type LibraryPickRefusal =
  WarmUpRefusal | CoolDownRefusal | SubstitutionRefusal;

type PickDestination =
  | { place: "substitution"; rowId: string }
  | { place: "warm-up" }
  | { place: "cool-down" }
  | { place: "slot" };

type LibraryPicksOptions = {
  newId: () => string;
  libraryExercises: readonly LibraryExercise[];
  libraryEquipment: readonly Equipment[];
};

const ACCESSORIES_SLOT: Slot = "C";

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

    return matching ?? ACCESSORIES_SLOT;
  }

  /** Why a pick adds nothing: the place it would land refuses it. */
  refusalFor(block: Block, pick: LibraryPick): LibraryPickRefusal | undefined {
    const sessionId = pick.target?.sessionId ?? pick.openSessionId;
    const session = block.sessions.find((other) => other.id === sessionId);
    if (!session) return undefined;
    const destination = LibraryPicks.destinationOf(pick);
    const { id } = pick.exercise;
    if (destination.place === "substitution") {
      return this.sessionEditingFor(block).substitutionRefusalFor(
        session,
        destination.rowId,
        id,
      );
    }
    if (destination.place === "warm-up") {
      return this.warmUpEditing.refusalFor(session, id);
    }
    if (destination.place === "cool-down") {
      return this.coolDownEditing.refusalFor(session, id);
    }

    return undefined;
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
    const sessionEditing = this.sessionEditingFor(block);
    const destination = LibraryPicks.destinationOf({ exercise, target });
    if (destination.place === "substitution") {
      return sessionEditing.addSubstitution(
        session,
        destination.rowId,
        exercise.id,
      );
    }
    if (destination.place === "warm-up") {
      return this.warmUpEditing.add(session, exercise.id);
    }
    if (destination.place === "cool-down") {
      return this.coolDownEditing.add(session, exercise.id);
    }
    const slot =
      target?.kind === "slot"
        ? target.slot
        : LibraryPicks.quickAddSlot(block, session, exercise);

    return sessionEditing.add(session, exercise, { slot });
  }

  private sessionEditingFor(block: Block): SessionEditing {
    return new SessionEditing({ ...this.options, blockType: block.type });
  }

  private static destinationOf({
    exercise,
    target,
  }: Pick<LibraryPick, "exercise" | "target">): PickDestination {
    if (target?.kind === "substitution") {
      return { place: "substitution", rowId: target.rowId };
    }
    if (target?.kind === "warm-up" || exercise.type === "mobility") {
      return { place: "warm-up" };
    }
    if (target?.kind === "cool-down" || exercise.type === "stretching") {
      return { place: "cool-down" };
    }

    return { place: "slot" };
  }
}
