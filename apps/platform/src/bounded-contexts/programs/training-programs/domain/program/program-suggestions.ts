import { BlockWeeks } from "./block-weeks";
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
import { templateText } from "./program-templates";
import { SplitTemplate } from "./split-template";
import type { BlockType, ClientLevel, ProgramLanguage } from "./vocabulary";

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

export type BlockSetup = Pick<
  ProgramSetupValues,
  "splitShape" | "trainingDays" | "sessionMinutes" | "dailySteps" | "language"
>;

type NewBlockContext = { setup: BlockSetup; previous?: Block };

export type ProposedBlock = { type: BlockType; weeks: number };

const PROPOSED_WEEKS = 4;
const DELOAD_AFTER_WEEKS = 4;

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

  static proposedBlockAfter(
    lastBlock: Pick<Block, "type" | "weeks"> | undefined,
  ): ProposedBlock {
    const loading =
      lastBlock?.type === "strength" || lastBlock?.type === "hypertrophy";
    const type =
      loading && lastBlock.weeks >= DELOAD_AFTER_WEEKS
        ? "deload"
        : "hypertrophy";

    return { type, weeks: BlockWeeks.forType(type, PROPOSED_WEEKS) };
  }

  initialContent(setup: ProgramSetupValues): ProgramContent {
    const blocks: Block[] = [];
    for (const { type, weeks, calibrationWeek } of SUGGESTED_BLOCKS[
      setup.level
    ]) {
      const block = this.newBlock(type, weeks, {
        setup,
        previous: blocks.at(-1),
      });
      blocks.push({ ...block, calibrationWeek });
    }

    return {
      header: { title: "", focus: "", personalNote: "" },
      plan: { blocks },
      nutritionNotes: "",
      lifestyleNotes: "",
    };
  }

  newBlock(
    type: BlockType,
    weeks: number,
    { setup, previous }: NewBlockContext,
  ): Block {
    if (type === "deload" && previous) {
      return this.deloadAfter(previous, weeks, setup);
    }
    const { newId } = this.options;
    const shape = setup.splitShape;
    const sessions = previous
      ? this.copiedSessions(previous.sessions)
      : SplitTemplate.of(shape).emptySessions(setup.trainingDays, newId);
    const cardioSessions = this.cardioPresets.defaultsFor(type);

    return {
      id: newId(),
      originId: newId(),
      type,
      weeks,
      trainingDays: previous?.trainingDays ?? setup.trainingDays,
      calibrationWeek: false,
      ...this.blockTexts(type, setup.language),
      clientNote: "",
      split: previous
        ? { ...previous.split }
        : {
            shape,
            name: "",
            text: SplitTemplate.of(shape).text(
              setup.trainingDays,
              setup.language,
            ),
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
    weeks: number,
    setup: BlockSetup,
  ): Block {
    return {
      ...this.blockWithFreshIds(previous),
      type: "deload",
      ...this.blockTexts("deload", setup.language),
      originId: this.options.newId(),
      weeks,
      calibrationWeek: false,
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
