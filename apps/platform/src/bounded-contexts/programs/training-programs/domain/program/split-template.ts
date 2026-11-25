import {
  mapCalendar,
  type CalendarEntry,
  type CardioSession,
  type Session,
  type WeeklyCalendar,
} from "./program-content";
import { fillTemplate, templateText } from "./program-templates";
import {
  WEEKDAYS,
  type ProgramLanguage,
  type SplitShape,
  type Weekday,
} from "./vocabulary";

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

  static cardioFitting(
    cardioSessions: readonly CardioSession[],
    trainingDays: number,
  ): CardioSession[] {
    return cardioSessions.slice(0, WEEKDAYS.length - trainingDays);
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

  text(days: number, language: ProgramLanguage): string {
    return fillTemplate(templateText(`split.${this.shape}`, language), {
      days,
    });
  }

  emptySessions(days: number, newId: () => string): Session[] {
    return this.sessionNames(days).map((name) => {
      const id = newId();

      return {
        id,
        originId: id,
        name,
        warmUp: { items: [] },
        coolDown: { enabled: false, items: [] },
        rows: [],
      };
    });
  }

  weeklyCalendar(
    sessionIds: readonly string[],
    cardioSessions: readonly CardioSession[],
  ): WeeklyCalendar {
    const calendar = mapCalendar((): CalendarEntry => ({ kind: "rest" }));
    const sessionDays = this.trainingWeekdays(sessionIds.length);
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

  private trainingWeekdays(sessionCount: number): Weekday[] {
    return [...(LAYOUTS[sessionCount] ?? WEEKDAYS.slice(0, sessionCount))];
  }
}
