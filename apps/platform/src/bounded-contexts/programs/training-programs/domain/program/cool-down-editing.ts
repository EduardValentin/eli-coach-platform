import type { CoolDown, CoolDownItem, Session } from "./program-content";

const STRETCH_SECONDS = 30;

export type CoolDownRefusal = "already-in-cool-down";

type CoolDownEditingOptions = { newId: () => string };

/** A session's cool-down: switched on or off, its stretches held for seconds, none twice. */
export class CoolDownEditing {
  constructor(private readonly options: CoolDownEditingOptions) {}

  withCoolDown(session: Session, coolDown: CoolDown): Session {
    return { ...session, coolDown };
  }

  refusalFor(
    session: Session,
    exerciseId: string,
  ): CoolDownRefusal | undefined {
    return session.coolDown.items.some((item) => item.exerciseId === exerciseId)
      ? "already-in-cool-down"
      : undefined;
  }

  add(session: Session, exerciseId: string): Session {
    if (this.refusalFor(session, exerciseId)) return session;
    const { items } = session.coolDown;

    return CoolDownEditing.withItems(session, [
      ...items,
      { id: this.options.newId(), exerciseId, seconds: STRETCH_SECONDS },
    ]);
  }

  changeItem(session: Session, item: CoolDownItem): Session {
    return CoolDownEditing.withItems(
      session,
      session.coolDown.items.map((other) =>
        other.id === item.id ? item : other,
      ),
    );
  }

  moveUp(session: Session, itemId: string): Session {
    return CoolDownEditing.moved(session, itemId, -1);
  }

  moveDown(session: Session, itemId: string): Session {
    return CoolDownEditing.moved(session, itemId, 1);
  }

  remove(session: Session, itemId: string): Session {
    return CoolDownEditing.withItems(
      session,
      session.coolDown.items.filter((item) => item.id !== itemId),
    );
  }

  private static withItems(session: Session, items: CoolDownItem[]): Session {
    return { ...session, coolDown: { ...session.coolDown, items } };
  }

  private static moved(
    session: Session,
    itemId: string,
    step: number,
  ): Session {
    const items = session.coolDown.items;
    const index = items.findIndex((item) => item.id === itemId);
    const target = index + step;
    if (index < 0 || target < 0 || target >= items.length) return session;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];

    return CoolDownEditing.withItems(session, next);
  }
}
