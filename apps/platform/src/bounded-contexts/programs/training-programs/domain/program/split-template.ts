import type { MovementPattern } from "./library-exercise";
import {
  mapCalendar,
  type Block,
  type CalendarEntry,
  type CardioSession,
  type Session,
  type WeeklyCalendar,
} from "./program-content";
import { fillTemplate, templateText } from "./program-templates";
import {
  WEEKDAYS,
  type ProgramLanguage,
  type Slot,
  type SplitShape,
  type Weekday,
} from "./vocabulary";

export type SlotPlan = {
  slot: Slot;
  patterns: MovementPattern[];
  label: string;
};

type SessionTemplate = { name: string; slots: SlotPlan[] };

type MainAndSecondary = {
  main: MovementPattern[];
  secondary: MovementPattern[];
};

const FULL_BODY_MAX_DAYS = 3;
const SESSION_LETTERS = ["A", "B", "C", "D", "E"];

const SLOT_LABELS: Record<Slot, string> = {
  A: "Main lift",
  B: "Secondary",
  C: "Accessories",
  D: "Core / finisher",
};
const CORE: SlotPlan = { slot: "D", patterns: ["core"], label: SLOT_LABELS.D };
const ISOLATION: SlotPlan = {
  slot: "C",
  patterns: ["isolation"],
  label: SLOT_LABELS.C,
};

const FALLBACK_SLOT_PLANS: Record<Slot, SlotPlan> = {
  A: { slot: "A", patterns: [], label: SLOT_LABELS.A },
  B: { slot: "B", patterns: [], label: SLOT_LABELS.B },
  C: ISOLATION,
  D: CORE,
};

const FULL_BODY_LOWER: MainAndSecondary[] = [
  { main: ["squat"], secondary: ["hinge", "lunge"] },
  { main: ["hinge"], secondary: ["squat", "lunge"] },
];
const FULL_BODY_ACCESSORIES: SlotPlan[] = [
  {
    slot: "C",
    patterns: ["horizontal-push", "vertical-push"],
    label: SLOT_LABELS.C,
  },
  {
    slot: "C",
    patterns: ["horizontal-pull", "vertical-pull"],
    label: SLOT_LABELS.C,
  },
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
  private static readonly UPPER_LOWER_SESSIONS: SessionTemplate[] = [
    SplitTemplate.upperLowerSession("Lower A", {
      main: ["squat"],
      secondary: ["hinge", "lunge"],
    }),
    SplitTemplate.upperLowerSession("Upper A", {
      main: ["horizontal-push"],
      secondary: ["vertical-pull", "horizontal-pull"],
    }),
    SplitTemplate.upperLowerSession("Lower B", {
      main: ["hinge"],
      secondary: ["lunge", "squat"],
    }),
    SplitTemplate.upperLowerSession("Upper B", {
      main: ["vertical-pull"],
      secondary: ["vertical-push", "horizontal-push"],
    }),
    SplitTemplate.upperLowerSession("Lower C", {
      main: ["squat"],
      secondary: ["hinge", "lunge"],
    }),
  ];

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

  /** The movement patterns the split suggests for a slot of the session at its position in the block. */
  static slotPlanFor(
    block: Block,
    session: Session,
    slot: Slot,
  ): SlotPlan | undefined {
    const index = block.sessions.findIndex((other) => other.id === session.id);
    if (index < 0) return undefined;
    const template = SplitTemplate.of(block.split.shape).sessionTemplates(
      block.sessions.length,
    )[index];
    const plans = template?.slots.filter((plan) => plan.slot === slot) ?? [];
    const [first] = plans;
    if (!first) return undefined;

    return { ...first, patterns: plans.flatMap((plan) => plan.patterns) };
  }

  /** The slot's plan, or its usual one for a session the split does not plan. */
  static slotPlanOrUsual(block: Block, session: Session, slot: Slot): SlotPlan {
    return (
      SplitTemplate.slotPlanFor(block, session, slot) ??
      FALLBACK_SLOT_PLANS[slot]
    );
  }

  get label(): string {
    return LABELS[this.shape];
  }

  sessionNames(days: number): string[] {
    return this.sessionTemplates(days).map((template) => template.name);
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

  private static mainAndSecondary({
    main,
    secondary,
  }: MainAndSecondary): SlotPlan[] {
    return [
      { slot: "A", patterns: main, label: SLOT_LABELS.A },
      { slot: "B", patterns: secondary, label: SLOT_LABELS.B },
    ];
  }

  private static upperLowerSession(
    name: string,
    lifts: MainAndSecondary,
  ): SessionTemplate {
    return {
      name,
      slots: [...SplitTemplate.mainAndSecondary(lifts), ISOLATION, CORE],
    };
  }

  private sessionTemplates(days: number): SessionTemplate[] {
    if (this.shape === "upper-lower") {
      return SplitTemplate.UPPER_LOWER_SESSIONS.slice(0, days);
    }

    return SESSION_LETTERS.slice(0, days).map((letter, index) => ({
      name: `Full Body ${letter}`,
      slots: [
        ...SplitTemplate.mainAndSecondary(
          FULL_BODY_LOWER[index % FULL_BODY_LOWER.length],
        ),
        ...FULL_BODY_ACCESSORIES,
        CORE,
      ],
    }));
  }

  private trainingWeekdays(sessionCount: number): Weekday[] {
    return [...(LAYOUTS[sessionCount] ?? WEEKDAYS.slice(0, sessionCount))];
  }
}
