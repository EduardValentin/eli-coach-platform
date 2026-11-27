import { BlockWeeks } from "./block-weeks";
import {
  mapCalendar,
  type Block,
  type CalendarEntry,
  type CardioSession,
  type Session,
} from "./program-content";
import { RowDefaults, type BlockTypeChangeContext } from "./row-defaults";
import { SplitTemplate } from "./split-template";
import {
  WEEKDAYS,
  type BlockType,
  type ProgramLanguage,
  type SplitShape,
  type TrainingDays,
  type Weekday,
} from "./vocabulary";

export type DayChoice =
  | { kind: "session"; sessionId: string }
  | { kind: "cardio" }
  | { kind: "rest" };

type DayPlacement = { entry: CalendarEntry; newCardio?: CardioSession };

type BlockEditingOptions = { newId: () => string };

const NEW_CARDIO_NAME = "Cardio";

export class BlockEditing {
  private readonly rowDefaults: RowDefaults;

  constructor(private readonly options: BlockEditingOptions) {
    this.rowDefaults = new RowDefaults(options);
  }

  /** The strength sessions in the order the builder lists them: by weekday on the calendar, then the ones off it. */
  static listedSessions(block: Block): Session[] {
    const scheduledIds = WEEKDAYS.flatMap((day) => {
      const entry = block.calendar[day];

      return entry.kind === "session" ? [entry.sessionId] : [];
    });
    const scheduled = [...new Set(scheduledIds)].flatMap((id) =>
      block.sessions.filter((session) => session.id === id),
    );

    return [
      ...scheduled,
      ...block.sessions.filter((session) => !scheduled.includes(session)),
    ];
  }

  blockWithDay(block: Block, day: Weekday, choice: DayChoice): Block {
    const { entry, newCardio } = this.placementFor(block, day, choice);
    const previous = block.calendar[day];
    const removedSessionId =
      previous.kind === "session" && choice.kind !== "session"
        ? previous.sessionId
        : undefined;
    const calendar = mapCalendar((other) => {
      if (other === day) return entry;
      const current = block.calendar[other];
      const isDayTheSessionLeft =
        choice.kind === "session" &&
        current.kind === "session" &&
        current.sessionId === choice.sessionId;
      const isRemovedSessionDay =
        current.kind === "session" && current.sessionId === removedSessionId;

      return isDayTheSessionLeft || isRemovedSessionDay
        ? { kind: "rest" }
        : current;
    });
    const replacedCardioId =
      previous.kind === "cardio" && entry.kind !== "cardio"
        ? previous.cardioId
        : undefined;

    return {
      ...block,
      calendar,
      sessions: block.sessions.filter(
        (session) => session.id !== removedSessionId,
      ),
      cardioSessions: [
        ...block.cardioSessions.filter(
          (cardio) => cardio.id !== replacedCardioId,
        ),
        ...(newCardio ? [newCardio] : []),
      ],
    };
  }

  blockWithSplit(
    block: Block,
    shape: SplitShape,
    language: ProgramLanguage,
  ): Block {
    const template = SplitTemplate.of(shape);
    const sessions = template.emptySessions(
      block.trainingDays,
      this.options.newId,
    );

    return {
      ...block,
      split: {
        ...block.split,
        shape,
        text: template.text(block.trainingDays, language),
      },
      sessions,
      calendar: template.weeklyCalendar(
        sessions.map((session) => session.id),
        block.cardioSessions,
      ),
    };
  }

  relayoutBlock(block: Block, days: TrainingDays): Block {
    const template = SplitTemplate.of(block.split.shape);
    const kept = block.sessions.slice(0, days);
    const added = template
      .emptySessions(days, this.options.newId)
      .slice(kept.length);
    const sessions = [...kept, ...added];
    const cardioSessions = SplitTemplate.cardioFitting(
      block.cardioSessions,
      days,
    );

    return {
      ...block,
      trainingDays: days,
      sessions,
      cardioSessions,
      calendar: template.weeklyCalendar(
        sessions.map((session) => session.id),
        cardioSessions,
      ),
    };
  }

  blockWithType(
    block: Block,
    type: BlockType,
    typeChangeContext: BlockTypeChangeContext,
  ): Block {
    if (type === "deload") {
      return this.rowDefaults.blockSwitchedToDeload(block, typeChangeContext);
    }
    const reDefaulted = this.rowDefaults.reDefaultedBlock(block, type);

    return { ...reDefaulted, weeks: BlockWeeks.forType(type, block.weeks) };
  }

  private placementFor(
    block: Block,
    day: Weekday,
    choice: DayChoice,
  ): DayPlacement {
    if (choice.kind === "session") {
      return { entry: { kind: "session", sessionId: choice.sessionId } };
    }
    if (choice.kind === "rest") return { entry: { kind: "rest" } };
    const current = block.calendar[day];
    if (current.kind === "cardio") return { entry: current };
    const newCardio = this.emptyCardioSession();

    return { entry: { kind: "cardio", cardioId: newCardio.id }, newCardio };
  }

  private emptyCardioSession(): CardioSession {
    const id = this.options.newId();

    return { id, originId: id, name: NEW_CARDIO_NAME, segments: [] };
  }
}
