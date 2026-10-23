import { newId, swappedWithNeighbour, type CoolDown, type CoolDownItem, type Session } from './program';

const STRETCH_SECONDS = 30;

export function coolDownEdits(session: Session) {
  const { coolDown } = session;
  const { items } = coolDown;
  const withItems = (next: CoolDownItem[]): Session => ({ ...session, coolDown: { ...coolDown, items: next } });

  return {
    change(next: CoolDown): Session {
      return { ...session, coolDown: next };
    },
    add(exerciseId: string): Session {
      if (items.some(item => item.exerciseId === exerciseId)) return session;
      return withItems([...items, { id: newId(), exerciseId, seconds: STRETCH_SECONDS }]);
    },
    changeItem(item: CoolDownItem): Session {
      return withItems(items.map(other => (other.id === item.id ? item : other)));
    },
    moveUp(itemId: string): Session {
      return withItems(swappedWithNeighbour(items, itemId, -1));
    },
    moveDown(itemId: string): Session {
      return withItems(swappedWithNeighbour(items, itemId, 1));
    },
    remove(itemId: string): Session {
      return withItems(items.filter(item => item.id !== itemId));
    },
  };
}

export type CoolDownEdits = ReturnType<typeof coolDownEdits>;
