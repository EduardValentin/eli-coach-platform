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

export function dayLengthOf(plan: DayPlan): string | null {
  if (plan.kind === "session") {
    return SessionTiming.estimatedDuration(
      SessionTiming.routineMinutes(plan.session),
    );
  }
  if (plan.kind === "rest" || plan.cardio.segments.length === 0) return null;

  return `${SessionTiming.cardioMinutes(plan.cardio)} min`;
}

export function weekdayAbbreviation(weekday: Weekday): string {
  return WEEKDAY_LABELS[weekday].slice(0, 3);
}
