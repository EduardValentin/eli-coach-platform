import {
  SessionTiming,
  WEEKDAY_LABELS,
  type Block,
  type CardioSession,
  type Session,
  type Weekday,
} from "~/bounded-contexts/programs/training-programs/public/program-editing";

export type DayPlan =
  | { kind: "session"; session: Session }
  | { kind: "cardio"; cardio: CardioSession }
  | { kind: "rest" };

export type WeekDay = { weekday: Weekday; plan: DayPlan };

export function planOn(block: Block, weekday: Weekday): DayPlan {
  const entry = block.calendar[weekday];
  const session =
    entry.kind === "session"
      ? block.sessions.find((candidate) => candidate.id === entry.sessionId)
      : undefined;
  if (session) return { kind: "session", session };
  const cardio =
    entry.kind === "cardio"
      ? block.cardioSessions.find(
          (candidate) => candidate.id === entry.cardioId,
        )
      : undefined;

  return cardio ? { kind: "cardio", cardio } : { kind: "rest" };
}

export function dayPlanName(plan: DayPlan): string {
  if (plan.kind === "session") return plan.session.name;

  return plan.kind === "cardio" ? plan.cardio.name : "Rest";
}

type DayLength = { shown: string; spoken: string };

export function dayLengthOf(plan: DayPlan): DayLength | null {
  if (plan.kind === "session") {
    const minutes = SessionTiming.routineMinutes(plan.session);

    return {
      shown: SessionTiming.estimatedDuration(minutes),
      spoken: `about ${minutes} min`,
    };
  }
  if (plan.kind === "rest" || plan.cardio.segments.length === 0) return null;
  const minutes = `${SessionTiming.cardioMinutes(plan.cardio)} min`;

  return { shown: minutes, spoken: minutes };
}

export function weekdayAbbreviation(weekday: Weekday): string {
  return WEEKDAY_LABELS[weekday].slice(0, 3);
}
