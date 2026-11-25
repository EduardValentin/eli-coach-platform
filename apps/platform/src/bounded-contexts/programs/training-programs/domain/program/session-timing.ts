import type { CardioSession, Range, Session } from "./program-content";

const SECONDS_PER_REP = 4;
const ROUTINE_ITEM_TRANSITION_SECONDS = 15;
const SECONDS_PER_MINUTE = 60;
const NO_REPS: Range = { min: 0, max: 0 };

export class SessionTiming {
  static routineMinutes(session: Session): number {
    const seconds =
      SessionTiming.warmUpSeconds(session) +
      SessionTiming.coolDownSeconds(session);

    return Math.round(seconds / SECONDS_PER_MINUTE);
  }

  static estimatedDuration(minutes: number): string {
    return minutes === 0 ? "0 min" : `~${minutes} min`;
  }

  static cardioMinutes(cardio: CardioSession): number {
    return Math.round(
      cardio.segments.reduce((total, segment) => total + segment.minutes, 0),
    );
  }

  private static repSeconds(reps: Range): number {
    return ((reps.min + reps.max) / 2) * SECONDS_PER_REP;
  }

  private static warmUpSeconds(session: Session): number {
    return session.warmUp.items.reduce((total, item) => {
      const setSeconds =
        item.seconds ?? SessionTiming.repSeconds(item.reps ?? NO_REPS);

      return total + ROUTINE_ITEM_TRANSITION_SECONDS + item.sets * setSeconds;
    }, 0);
  }

  private static coolDownSeconds(session: Session): number {
    if (!session.coolDown.enabled) return 0;

    return session.coolDown.items.reduce(
      (total, item) => total + ROUTINE_ITEM_TRANSITION_SECONDS + item.seconds,
      0,
    );
  }
}
