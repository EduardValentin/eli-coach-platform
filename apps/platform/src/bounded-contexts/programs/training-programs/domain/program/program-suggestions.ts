import type { CardioExercise } from "./cardio-exercises-port";
import { CardioPresets } from "./cardio-presets";
import {
  mapCalendar,
  type Block,
  type CardioSession,
  type ProgramContent,
  type Session,
  type WeeklyCalendar,
} from "./program-content";
import type { ProgramSetupValues } from "./program-setup";
import { fillTemplate, templateText } from "./program-templates";
import { SplitTemplate } from "./split-template";
import type {
  BlockType,
  ClientLevel,
  ProgramLanguage,
  SplitShape,
} from "./vocabulary";

type SuggestedBlock = {
  type: BlockType;
  weeks: number;
  calibrationWeek: boolean;
};

const SUGGESTED_BLOCKS: Record<ClientLevel, readonly SuggestedBlock[]> = {
  beginner: [
    { type: "foundation", weeks: 4, calibrationWeek: false },
    { type: "hypertrophy", weeks: 6, calibrationWeek: false },
    { type: "deload", weeks: 1, calibrationWeek: false },
  ],
  intermediate: [
    { type: "hypertrophy", weeks: 6, calibrationWeek: true },
    { type: "deload", weeks: 1, calibrationWeek: false },
    { type: "hypertrophy", weeks: 6, calibrationWeek: false },
  ],
  advanced: [
    { type: "hypertrophy", weeks: 5, calibrationWeek: true },
    { type: "deload", weeks: 1, calibrationWeek: false },
    { type: "strength", weeks: 4, calibrationWeek: false },
    { type: "deload", weeks: 1, calibrationWeek: false },
  ],
};

type BlockTexts = Pick<Block, "introText" | "missedDayNote">;

type CopiedIds = {
  sessionIds: ReadonlyMap<string, string>;
  cardioIds: ReadonlyMap<string, string>;
};

type ProgramSuggestionsOptions = {
  cardioExercises: readonly CardioExercise[];
  newId: () => string;
};

export class ProgramSuggestions {
  private readonly cardioPresets: CardioPresets;

  constructor(private readonly options: ProgramSuggestionsOptions) {
    this.cardioPresets = new CardioPresets(options);
  }

  initialContent(setup: ProgramSetupValues): ProgramContent {
    const blocks: Block[] = [];
    for (const suggestion of SUGGESTED_BLOCKS[setup.level]) {
      blocks.push(this.newBlock(suggestion, setup, blocks.at(-1)));
    }

    return {
      header: { title: "", focus: "", personalNote: "" },
      plan: { blocks },
      nutritionNotes: "",
      lifestyleNotes: "",
    };
  }

  private newBlock(
    suggestion: SuggestedBlock,
    setup: ProgramSetupValues,
    previous: Block | undefined,
  ): Block {
    const { type, weeks, calibrationWeek } = suggestion;

    if (type === "deload" && previous) {
      return this.deloadAfter(previous, suggestion, setup);
    }
    const { newId } = this.options;
    const shape = setup.splitShape;
    const sessions = previous
      ? this.copiedSessions(previous.sessions)
      : this.emptySessionsFor(shape, setup.trainingDays);
    const cardioSessions = this.cardioPresets.defaultsFor(type);

    return {
      id: newId(),
      originId: newId(),
      type,
      weeks,
      trainingDays: previous?.trainingDays ?? setup.trainingDays,
      calibrationWeek,
      ...this.blockTexts(type, setup.language),
      clientNote: "",
      split: previous
        ? { ...previous.split }
        : {
            shape,
            name: "",
            text: fillTemplate(templateText(`split.${shape}`, setup.language), {
              days: setup.trainingDays,
            }),
          },
      targetMinutes: setup.sessionMinutes,
      calendar: SplitTemplate.of(previous?.split.shape ?? shape).weeklyCalendar(
        sessions.map((session) => session.id),
        cardioSessions,
      ),
      sessions,
      cardioSessions,
      dailySteps: setup.dailySteps,
    };
  }

  private deloadAfter(
    previous: Block,
    { weeks, calibrationWeek }: SuggestedBlock,
    setup: ProgramSetupValues,
  ): Block {
    return {
      ...this.blockWithFreshIds(previous),
      type: "deload",
      ...this.blockTexts("deload", setup.language),
      originId: this.options.newId(),
      weeks,
      calibrationWeek,
      clientNote: "",
      targetMinutes: setup.sessionMinutes,
      dailySteps: setup.dailySteps,
    };
  }

  private blockTexts(type: BlockType, language: ProgramLanguage): BlockTexts {
    return {
      introText: templateText(`block.${type}`, language),
      missedDayNote: templateText("missedDay", language),
    };
  }

  private emptySessionsFor(shape: SplitShape, days: number): Session[] {
    return SplitTemplate.of(shape)
      .sessionNames(days)
      .map((name) => {
        const id = this.options.newId();

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

  private blockWithFreshIds(block: Block): Block {
    const sessions = this.copiedSessions(block.sessions);
    const cardioSessions = this.copiedCardioSessions(block.cardioSessions);

    return {
      ...block,
      id: this.options.newId(),
      calendar: this.calendarWithIds(block.calendar, {
        sessionIds: this.idsByPosition(block.sessions, sessions),
        cardioIds: this.idsByPosition(block.cardioSessions, cardioSessions),
      }),
      sessions,
      cardioSessions,
    };
  }

  private copiedSessions(sessions: readonly Session[]): Session[] {
    const { newId } = this.options;

    return sessions.map((session) => ({
      ...session,
      id: newId(),
      rows: session.rows.map((row) => ({ ...row, id: newId() })),
    }));
  }

  private copiedCardioSessions(
    cardioSessions: readonly CardioSession[],
  ): CardioSession[] {
    const { newId } = this.options;

    return cardioSessions.map((cardio) => ({
      ...cardio,
      id: newId(),
      segments: cardio.segments.map((segment) => ({ ...segment, id: newId() })),
    }));
  }

  private idsByPosition(
    before: readonly { id: string }[],
    after: readonly { id: string }[],
  ): ReadonlyMap<string, string> {
    return new Map(before.map((item, index) => [item.id, after[index].id]));
  }

  private calendarWithIds(
    calendar: WeeklyCalendar,
    { sessionIds, cardioIds }: CopiedIds,
  ): WeeklyCalendar {
    return mapCalendar((day) => {
      const entry = calendar[day];
      if (entry.kind === "session") {
        return {
          kind: "session",
          sessionId: sessionIds.get(entry.sessionId) ?? entry.sessionId,
        };
      }
      if (entry.kind === "cardio") {
        return {
          kind: "cardio",
          cardioId: cardioIds.get(entry.cardioId) ?? entry.cardioId,
        };
      }

      return entry;
    });
  }
}
