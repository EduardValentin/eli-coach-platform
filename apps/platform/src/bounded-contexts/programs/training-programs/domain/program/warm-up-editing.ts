import type { LibraryExercise } from "./library-exercise";
import {
  MAX_WARM_UP_ITEMS,
  type Range,
  type Session,
  type WarmUpItem,
} from "./program-content";

const WARM_UP_REPS: Range = { min: 10, max: 10 };
const WARM_UP_SECONDS = 45;

type WarmUpEditingOptions = {
  newId: () => string;
  libraryExercises: readonly LibraryExercise[];
};

/** A session's warm-up: at most four exercises, none twice, each with sets and reps or seconds. */
export class WarmUpEditing {
  constructor(private readonly options: WarmUpEditingOptions) {}

  add(session: Session, exerciseId: string): Session {
    const { items } = session.warmUp;
    if (
      items.some((item) => item.exerciseId === exerciseId) ||
      items.length >= MAX_WARM_UP_ITEMS
    ) {
      return session;
    }

    return WarmUpEditing.withItems(session, [
      ...items,
      this.warmUpItem(exerciseId),
    ]);
  }

  changeItem(session: Session, item: WarmUpItem): Session {
    return WarmUpEditing.withItems(
      session,
      session.warmUp.items.map((other) =>
        other.id === item.id ? item : other,
      ),
    );
  }

  remove(session: Session, itemId: string): Session {
    return WarmUpEditing.withItems(
      session,
      session.warmUp.items.filter((item) => item.id !== itemId),
    );
  }

  moveUp(session: Session, itemId: string): Session {
    return WarmUpEditing.moved(session, itemId, -1);
  }

  moveDown(session: Session, itemId: string): Session {
    return WarmUpEditing.moved(session, itemId, 1);
  }

  private warmUpItem(exerciseId: string): WarmUpItem {
    const id = this.options.newId();
    const exercise = this.options.libraryExercises.find(
      (item) => item.id === exerciseId,
    );
    if (exercise?.unit === "time") {
      return { id, exerciseId, sets: 1, seconds: WARM_UP_SECONDS };
    }

    return { id, exerciseId, sets: 1, reps: { ...WARM_UP_REPS } };
  }

  private static withItems(session: Session, items: WarmUpItem[]): Session {
    return { ...session, warmUp: { items } };
  }

  private static moved(
    session: Session,
    itemId: string,
    step: number,
  ): Session {
    const items = session.warmUp.items;
    const index = items.findIndex((item) => item.id === itemId);
    const target = index + step;
    if (index < 0 || target < 0 || target >= items.length) return session;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];

    return WarmUpEditing.withItems(session, next);
  }
}
