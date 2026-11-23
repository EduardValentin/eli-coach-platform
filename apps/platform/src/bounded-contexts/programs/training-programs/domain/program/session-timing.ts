import type { CardioSession, Range, Session } from "./program-content";

type Amount = { range: Range; timed: boolean };

const SECONDS_PER_REP = 4;
const ROUTINE_ITEM_TRANSITION_SECONDS = 15;
const SECONDS_PER_MINUTE = 60;

export class SessionTiming {
  static estimatedMinutes(session: Session): number {
    const seconds =
      SessionTiming.warmUpSeconds(session) +
      SessionTiming.coolDownSeconds(session);

    return Math.round(seconds / SECONDS_PER_MINUTE);
  }

  static estimatedDuration(minutes: number): string {
    return minutes === 0 ? "0 min" : `~${minutes} min`;
  }

  static cardioMinutes(cardio: CardioSession): number {
    const seconds = cardio.segments.reduce(
      (total, segment) => total + segment.minutes * SECONDS_PER_MINUTE,
      0,
    );

    return Math.round(seconds / SECONDS_PER_MINUTE);
  }

  private static amountSeconds({ range, timed }: Amount): number {
    const middle = (range.min + range.max) / 2;

    return timed ? middle : middle * SECONDS_PER_REP;
  }

  private static warmUpSeconds(session: Session): number {
    return session.warmUp.items.reduce((total, item) => {
      const amount: Amount =
        item.seconds === undefined
          ? { range: item.reps ?? { min: 0, max: 0 }, timed: false }
          : { range: { min: item.seconds, max: item.seconds }, timed: true };

      return (
        total +
        ROUTINE_ITEM_TRANSITION_SECONDS +
        item.sets * SessionTiming.amountSeconds(amount)
      );
    }, 0);
  }

  private static coolDownSeconds(session: Session): number {
    if (!session.coolDown.enabled) return 0;

    return session.coolDown.items.reduce(
      (total, item) =>
        total +
        ROUTINE_ITEM_TRANSITION_SECONDS +
        SessionTiming.amountSeconds({
          range: { min: item.seconds, max: item.seconds },
          timed: true,
        }),
      0,
    );
  }
}
