import {
  mapCalendar,
  type CalendarEntry,
  type CardioSession,
  type WeeklyCalendar,
} from "./program-content";
import { WEEKDAYS, type SplitShape, type Weekday } from "./vocabulary";

const FULL_BODY_MAX_DAYS = 3;
const SESSION_LETTERS = ["A", "B", "C", "D", "E"];
const UPPER_LOWER_SESSION_NAMES = [
  "Lower A",
  "Upper A",
  "Lower B",
  "Upper B",
  "Lower C",
];

const LABELS: Record<SplitShape, string> = {
  "full-body": "Full Body",
  "upper-lower": "Upper / Lower",
};

const LAYOUTS: Partial<Record<number, readonly Weekday[]>> = {
  2: ["mon", "thu"],
  3: ["mon", "wed", "fri"],
  4: ["mon", "tue", "thu", "fri"],
  5: ["mon", "tue", "wed", "fri", "sat"],
};

export class SplitTemplate {
  private constructor(readonly shape: SplitShape) {}

  static of(shape: SplitShape): SplitTemplate {
    return new SplitTemplate(shape);
  }

  static forTrainingDays(days: number): SplitTemplate {
    return new SplitTemplate(
      days <= FULL_BODY_MAX_DAYS ? "full-body" : "upper-lower",
    );
  }

  get label(): string {
    return LABELS[this.shape];
  }

  sessionNames(days: number): string[] {
    if (this.shape === "upper-lower") {
      return UPPER_LOWER_SESSION_NAMES.slice(0, days);
    }

    return SESSION_LETTERS.slice(0, days).map(
      (letter) => `Full Body ${letter}`,
    );
  }

  layout(sessionCount: number): Weekday[] {
    return [...(LAYOUTS[sessionCount] ?? WEEKDAYS.slice(0, sessionCount))];
  }

  weeklyCalendar(
    sessionIds: readonly string[],
    cardioSessions: readonly CardioSession[],
  ): WeeklyCalendar {
    const calendar = mapCalendar((): CalendarEntry => ({ kind: "rest" }));
    const sessionDays = this.layout(sessionIds.length);
    sessionIds.forEach((sessionId, index) => {
      calendar[sessionDays[index]] = { kind: "session", sessionId };
    });
    const freeDays = WEEKDAYS.filter((day) => !sessionDays.includes(day));
    cardioSessions.forEach((session, index) => {
      if (index < freeDays.length) {
        calendar[freeDays[index]] = { kind: "cardio", cardioId: session.id };
      }
    });

    return calendar;
  }
}
