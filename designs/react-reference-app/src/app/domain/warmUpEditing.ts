import type { Exercise } from '../context/TrainingContext';
import { newId, swappedWithNeighbour, type Range, type Session, type WarmUpItem } from './program';

export const WARM_UP_REPS: Range = { min: 10, max: 10 };
export const WARM_UP_SECONDS = 45;
const MAX_WARM_UP_ITEMS = 4;

export type WarmUpRefusal = 'already-in-warm-up' | 'warm-up-full';

export function warmUpItem(exercise: Exercise | undefined, exerciseId: string): WarmUpItem {
  if (exercise?.measuredIn === 'time') return { id: newId(), exerciseId, sets: 1, seconds: WARM_UP_SECONDS };
  return { id: newId(), exerciseId, sets: 1, reps: { ...WARM_UP_REPS } };
}

export function warmUpEdits(session: Session, library: readonly Exercise[]) {
  const { items } = session.warmUp;
  const withItems = (next: WarmUpItem[]): Session => ({ ...session, warmUp: { items: next } });

  function refusalFor(exerciseId: string): WarmUpRefusal | undefined {
    if (items.some(item => item.exerciseId === exerciseId)) return 'already-in-warm-up';
    return items.length >= MAX_WARM_UP_ITEMS ? 'warm-up-full' : undefined;
  }

  return {
    refusalFor,
    add(exerciseId: string): Session {
      if (refusalFor(exerciseId)) return session;
      const exercise = library.find(item => item.id === exerciseId);
      return withItems([...items, warmUpItem(exercise, exerciseId)]);
    },
    changeItem(item: WarmUpItem): Session {
      return withItems(items.map(other => (other.id === item.id ? item : other)));
    },
    remove(itemId: string): Session {
      return withItems(items.filter(item => item.id !== itemId));
    },
    moveUp(itemId: string): Session {
      return withItems(swappedWithNeighbour(items, itemId, -1));
    },
    moveDown(itemId: string): Session {
      return withItems(swappedWithNeighbour(items, itemId, 1));
    },
  };
}

export type WarmUpEdits = ReturnType<typeof warmUpEdits>;
