// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { DndProvider } from "react-dnd";
import { TouchBackend } from "react-dnd-touch-backend";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  ProgramSuggestions,
  type Block,
  type BlockSetup,
  type BlockType,
  type ClientLevel,
  type ProgramContent,
  type Session,
} from "~/bounded-contexts/programs/training-programs/public/program-editing";

import { EditorAnnouncerProvider } from "./editor-announcer";
import type { BlocksUpdate } from "./plan-block-list";
import { PlanOverview } from "./plan-overview";

const SETUP: BlockSetup = {
  splitShape: "full-body",
  trainingDays: 3,
  sessionMinutes: 60,
  dailySteps: 6000,
  language: "en",
};

function idsFrom(prefix: string): () => string {
  let next = 0;

  return () => `${prefix}-${(next += 1)}`;
}

const suggestions = new ProgramSuggestions({
  libraryExercises: [],
  newId: idsFrom("fixture"),
});

function blockOf(type: BlockType, weeks: number): Block {
  return suggestions.newBlock(type, weeks, {
    setup: { ...SETUP, level: "beginner" },
  });
}

function row(id: string, exerciseId: string): Session["rows"][number] {
  return {
    id,
    exerciseId,
    slot: "C",
    startSets: [],
    restSeconds: 60,
    lastSetTechnique: "none",
    substitutions: [],
    progression: { kind: "double" },
    cues: "",
    touched: [],
  };
}

function withExercises(block: Block, sessionCount: number): Block {
  return {
    ...block,
    sessions: block.sessions.map((session, index) =>
      index < sessionCount
        ? {
            ...session,
            rows: [
              row(`${session.id}-row-1`, "squat"),
              row(`${session.id}-row-2`, "row"),
            ],
          }
        : session,
    ),
  };
}

function contentOf(blocks: Block[]): ProgramContent {
  return {
    header: { title: "", focus: "", personalNote: "" },
    plan: { blocks },
    nutritionNotes: "",
    lifestyleNotes: "",
  };
}

function withoutCardio(block: Block): Block {
  return { ...block, cardioSessions: [] };
}

const FOUNDATION = withoutCardio(blockOf("foundation", 4));
const HYPERTROPHY = withExercises(withoutCardio(blockOf("hypertrophy", 6)), 2);
const DELOAD = withoutCardio(blockOf("deload", 1));

type HarnessProps = {
  blocks: Block[];
  level?: ClientLevel;
  onOpenBlock?: (blockId: string) => void;
  onAddBlock?: () => void;
  onUseSuggestion?: () => void;
};

function Harness({
  blocks,
  level = "beginner",
  onOpenBlock = () => {},
  onAddBlock = () => {},
  onUseSuggestion = () => {},
}: HarnessProps) {
  const [content, setContent] = useState(contentOf(blocks));
  const change = (update: BlocksUpdate) =>
    setContent((current) => ({
      ...current,
      plan: { blocks: update(current.plan.blocks) },
    }));

  return (
    <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true }}>
      <EditorAnnouncerProvider>
        <PlanOverview
          content={content}
          level={level}
          libraryExercises={[]}
          onAddBlock={onAddBlock}
          onChange={change}
          onOpenBlock={onOpenBlock}
          onUseSuggestion={onUseSuggestion}
          settings={<p>Settings slot</p>}
        />
      </EditorAnnouncerProvider>
    </DndProvider>
  );
}

function blockList() {
  return screen.getByRole("list", { name: "Blocks" });
}

function blockRows() {
  return within(blockList()).getAllByRole("listitem");
}

function openButtonNames(): string[] {
  return within(blockList())
    .getAllByRole("button", { name: /^Open block / })
    .map((button) => button.getAttribute("aria-label") ?? button.textContent);
}

function rowOfBlock(position: number): HTMLElement {
  return blockRows()[position - 1];
}

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {};
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.releasePointerCapture = () => {};
  vi.stubGlobal(
    "ResizeObserver",
    class {
      disconnect() {}
      observe() {}
      unobserve() {}
    },
  );
});

afterEach(cleanup);

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("the plan overview", () => {
  describe("the block list", () => {
    it("lists each block with its type, weeks and how many of its sessions are filled", () => {
      // arrange, act
      render(<Harness blocks={[FOUNDATION, HYPERTROPHY, DELOAD]} />);

      // assert
      expect(blockRows()).toHaveLength(3);
      expect(
        within(rowOfBlock(1)).getByRole("combobox", {
          name: "Type of block 1",
        }),
      ).toHaveTextContent("Foundation");
      expect(
        within(rowOfBlock(2)).getByRole("spinbutton", {
          name: "Weeks of block 2",
        }),
      ).toHaveValue(6);
      expect(within(rowOfBlock(1)).getByText("0 of 3 sessions")).toBeVisible();
      expect(within(rowOfBlock(2)).getByText("2 of 3 sessions")).toBeVisible();
    });

    it("opens a block from its row", async () => {
      // arrange
      const user = userEvent.setup();
      const onOpenBlock = vi.fn();
      render(
        <Harness
          blocks={[FOUNDATION, HYPERTROPHY]}
          onOpenBlock={onOpenBlock}
        />,
      );

      // act
      await user.click(
        within(rowOfBlock(2)).getByRole("button", { name: /^Open block 2/ }),
      );

      // assert
      expect(onOpenBlock).toHaveBeenCalledWith(HYPERTROPHY.id);
    });

    it("asks to add a block", async () => {
      // arrange
      const user = userEvent.setup();
      const onAddBlock = vi.fn();
      render(<Harness blocks={[FOUNDATION]} onAddBlock={onAddBlock} />);

      // act
      await user.click(screen.getByRole("button", { name: "Add block" }));

      // assert
      expect(onAddBlock).toHaveBeenCalledTimes(1);
    });
  });

  describe("reordering from the keyboard", () => {
    it("moves a block down from its handle, keeps focus on the handle and announces the move", async () => {
      // arrange
      const user = userEvent.setup();
      render(<Harness blocks={[FOUNDATION, HYPERTROPHY, DELOAD]} />);
      const handle = screen.getByRole("button", {
        name: "Reorder Foundation block",
      });
      handle.focus();

      // act
      await user.keyboard("{ArrowDown}");

      // assert
      expect(
        within(rowOfBlock(2)).getByRole("combobox", {
          name: "Type of block 2",
        }),
      ).toHaveTextContent("Foundation");
      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent(
          "Foundation block moved to position 2 of 3",
        ),
      );
      expect(
        screen.getByRole("button", { name: "Reorder Foundation block" }),
      ).toHaveFocus();
    });

    it("moves a block up from its handle", async () => {
      // arrange
      const user = userEvent.setup();
      render(<Harness blocks={[FOUNDATION, HYPERTROPHY, DELOAD]} />);
      screen.getByRole("button", { name: "Reorder Deload block" }).focus();

      // act
      await user.keyboard("{ArrowUp}");

      // assert
      expect(
        within(rowOfBlock(2)).getByRole("combobox", {
          name: "Type of block 2",
        }),
      ).toHaveTextContent("Deload");
      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent(
          "Deload block moved to position 2 of 3",
        ),
      );
    });

    it("keeps the first block in place on arrow up", async () => {
      // arrange
      const user = userEvent.setup();
      render(<Harness blocks={[FOUNDATION, HYPERTROPHY]} />);
      screen.getByRole("button", { name: "Reorder Foundation block" }).focus();

      // act
      await user.keyboard("{ArrowUp}");

      // assert
      expect(
        within(rowOfBlock(1)).getByRole("combobox", {
          name: "Type of block 1",
        }),
      ).toHaveTextContent("Foundation");
      expect(screen.getByRole("status")).toBeEmptyDOMElement();
    });

    it("describes the handle's keys", () => {
      // arrange, act
      render(<Harness blocks={[FOUNDATION, HYPERTROPHY]} />);

      // assert
      expect(
        screen.getByRole("button", { name: "Reorder Foundation block" }),
      ).toHaveAccessibleDescription(
        "Press arrow up or arrow down to move the block.",
      );
    });
  });

  describe("removing a block", () => {
    it("asks first and names what is lost when the block holds exercises", async () => {
      // arrange
      const user = userEvent.setup();
      render(<Harness blocks={[FOUNDATION, HYPERTROPHY]} />);

      // act
      await user.click(
        screen.getByRole("button", { name: "Remove block 2, Hypertrophy" }),
      );

      // assert
      const dialog = await screen.findByRole("alertdialog", {
        name: "Remove block 2?",
      });
      expect(
        within(dialog).getByText("Full Body A · 2 exercises"),
      ).toBeVisible();
      expect(
        within(dialog).getByText("Full Body B · 2 exercises"),
      ).toBeVisible();
      expect(
        within(
          screen.getByRole("list", { name: "Blocks", hidden: true }),
        ).getAllByRole("listitem", { hidden: true }),
      ).toHaveLength(2);
    });

    it("offers only Cancel and Remove block, with no corner close", async () => {
      // arrange
      const user = userEvent.setup();
      render(<Harness blocks={[FOUNDATION, HYPERTROPHY]} />);

      // act
      await user.click(
        screen.getByRole("button", { name: "Remove block 2, Hypertrophy" }),
      );

      // assert
      const dialog = await screen.findByRole("alertdialog", {
        name: "Remove block 2?",
      });
      expect(
        within(dialog)
          .getAllByRole("button")
          .map((button) => button.textContent),
      ).toEqual(["Cancel", "Remove block"]);
    });

    it("removes the block once the coach confirms", async () => {
      // arrange
      const user = userEvent.setup();
      render(<Harness blocks={[FOUNDATION, HYPERTROPHY]} />);
      await user.click(
        screen.getByRole("button", { name: "Remove block 2, Hypertrophy" }),
      );
      const dialog = await screen.findByRole("alertdialog", {
        name: "Remove block 2?",
      });

      // act
      await user.click(
        within(dialog).getByRole("button", { name: "Remove block" }),
      );

      // assert
      await waitFor(() => expect(blockRows()).toHaveLength(1));
      expect(openButtonNames()).toHaveLength(1);
    });

    it("keeps the block and returns focus to the remove control when the coach cancels", async () => {
      // arrange
      const user = userEvent.setup();
      render(<Harness blocks={[FOUNDATION, HYPERTROPHY]} />);
      const remove = screen.getByRole("button", {
        name: "Remove block 2, Hypertrophy",
      });
      await user.click(remove);
      const dialog = await screen.findByRole("alertdialog", {
        name: "Remove block 2?",
      });

      // act
      await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

      // assert
      await waitFor(() => expect(remove).toHaveFocus());
      expect(blockRows()).toHaveLength(2);
    });

    it("keeps the block and returns focus to the remove control when the coach presses Escape", async () => {
      // arrange
      const user = userEvent.setup();
      render(<Harness blocks={[FOUNDATION, HYPERTROPHY]} />);
      const remove = screen.getByRole("button", {
        name: "Remove block 2, Hypertrophy",
      });
      await user.click(remove);
      await screen.findByRole("alertdialog", { name: "Remove block 2?" });

      // act
      await user.keyboard("{Escape}");

      // assert
      await waitFor(() =>
        expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
      );
      await waitFor(() => expect(remove).toHaveFocus());
      expect(blockRows()).toHaveLength(2);
    });

    it("removes a block with nothing to lose at once", async () => {
      // arrange
      const user = userEvent.setup();
      render(<Harness blocks={[FOUNDATION, DELOAD]} />);

      // act
      await user.click(
        screen.getByRole("button", { name: "Remove block 1, Foundation" }),
      );

      // assert
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      expect(blockRows()).toHaveLength(1);
      expect(
        within(rowOfBlock(1)).getByRole("combobox", {
          name: "Type of block 1",
        }),
      ).toHaveTextContent("Deload");
    });
  });

  describe("a block's type and weeks in its row", () => {
    it("forces a Deload to one week and explains why its weeks cannot change", async () => {
      // arrange
      const user = userEvent.setup();
      render(<Harness blocks={[FOUNDATION, HYPERTROPHY]} />);

      // act
      await user.click(
        within(rowOfBlock(2)).getByRole("combobox", {
          name: "Type of block 2",
        }),
      );
      await user.click(await screen.findByRole("option", { name: "Deload" }));

      // assert
      const weeks = within(rowOfBlock(2)).getByRole("spinbutton", {
        name: "Weeks of block 2",
      });
      expect(weeks).toHaveValue(1);
      expect(weeks).toBeDisabled();
      expect(weeks).toHaveAccessibleDescription("A deload is always 1 week");
    });

    it("changes the weeks of a block to a whole number of at least one", async () => {
      // arrange
      const user = userEvent.setup();
      render(<Harness blocks={[FOUNDATION, HYPERTROPHY]} />);
      const weeks = within(rowOfBlock(1)).getByRole("spinbutton", {
        name: "Weeks of block 1",
      });

      // act
      await user.clear(weeks);
      await user.type(weeks, "8");

      // assert
      expect(weeks).toHaveValue(8);
      expect(
        screen.getByRole("button", {
          name: "Week 8 of 14, Foundation week 8 of 8, open block",
        }),
      ).toBeVisible();
    });

    it.each(["0", "-3"])(
      "keeps the weeks of a block when %s is typed and restores them on leaving the field",
      async (typed) => {
        // arrange
        const user = userEvent.setup();
        render(<Harness blocks={[FOUNDATION, HYPERTROPHY]} />);
        const weeks = within(rowOfBlock(1)).getByRole("spinbutton", {
          name: "Weeks of block 1",
        });

        // act
        await user.clear(weeks);
        await user.type(weeks, typed);
        await user.tab();

        // assert
        expect(weeks).toHaveValue(4);
        expect(
          screen.getByRole("button", {
            name: "Week 10 of 10, Hypertrophy week 6 of 6, open block",
          }),
        ).toBeVisible();
      },
    );
  });

  describe("sequence problems", () => {
    it.each([
      {
        scenario: "a Foundation after the first block",
        blocks: [HYPERTROPHY, FOUNDATION],
        position: 2,
        message: "Foundation must be the first block",
      },
      {
        scenario: "a plan that starts with a Deload",
        blocks: [DELOAD, HYPERTROPHY],
        position: 1,
        message: "The plan cannot start with a Deload",
      },
      {
        scenario: "two Deloads in a row",
        blocks: [HYPERTROPHY, DELOAD, withoutCardio(blockOf("deload", 1))],
        position: 3,
        message: "Two Deloads cannot follow each other",
      },
    ])(
      "shows $scenario on the block it concerns",
      ({ blocks, position, message }) => {
        // arrange, act
        render(<Harness blocks={blocks} />);

        // assert
        expect(within(rowOfBlock(position)).getByText(message)).toBeVisible();
        expect(
          within(rowOfBlock(position)).getByRole("combobox", {
            name: `Type of block ${position}`,
          }),
        ).toHaveAccessibleDescription(message);
        expect(screen.getAllByText(message)).toHaveLength(1);
      },
    );

    it("shows no problem for a sound plan", () => {
      // arrange, act
      render(<Harness blocks={[FOUNDATION, HYPERTROPHY, DELOAD]} />);

      // assert
      expect(
        screen.queryByText(/must be the first|cannot start|cannot follow/),
      ).not.toBeInTheDocument();
    });
  });

  describe("the timeline", () => {
    it("names every week with its place in the plan and its block", () => {
      // arrange, act
      render(<Harness blocks={[FOUNDATION, HYPERTROPHY, DELOAD]} />);

      // assert
      const weeks = within(
        screen.getByRole("toolbar", { name: "Plan weeks" }),
      ).getAllByRole("button");
      expect(weeks).toHaveLength(11);
      expect(weeks[0]).toHaveAccessibleName(
        "Week 1 of 11, Foundation week 1 of 4, open block",
      );
      expect(weeks[10]).toHaveAccessibleName(
        "Week 11 of 11, Deload, open block",
      );
    });

    it("heads each block with its weeks and no dates", () => {
      // arrange, act
      render(<Harness blocks={[FOUNDATION, HYPERTROPHY, DELOAD]} />);

      // assert
      const timeline = screen.getByRole("list", { name: "Plan blocks" });
      expect(within(timeline).getByText("4 weeks")).toBeVisible();
      expect(within(timeline).getByText("6 weeks")).toBeVisible();
      expect(within(timeline).queryByText("1 week")).not.toBeInTheDocument();
      expect(timeline).not.toHaveTextContent(
        /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/,
      );
    });

    it("opens the block a week belongs to", async () => {
      // arrange
      const user = userEvent.setup();
      const onOpenBlock = vi.fn();
      render(
        <Harness
          blocks={[FOUNDATION, HYPERTROPHY, DELOAD]}
          onOpenBlock={onOpenBlock}
        />,
      );

      // act
      await user.click(
        screen.getByRole("button", {
          name: "Week 6 of 11, Hypertrophy week 2 of 6, open block",
        }),
      );

      // assert
      expect(onOpenBlock).toHaveBeenCalledWith(HYPERTROPHY.id);
    });

    it("moves across the weeks with the arrow keys, Home and End", async () => {
      // arrange
      const user = userEvent.setup();
      render(<Harness blocks={[FOUNDATION, HYPERTROPHY, DELOAD]} />);
      const toolbar = screen.getByRole("toolbar", { name: "Plan weeks" });
      const weeks = within(toolbar).getAllByRole("button");
      weeks[0].focus();

      // act
      await user.keyboard("{ArrowRight}{ArrowRight}");

      // assert
      expect(weeks[2]).toHaveFocus();

      // act
      await user.keyboard("{End}");

      // assert
      expect(weeks[10]).toHaveFocus();

      // act
      await user.keyboard("{Home}");

      // assert
      expect(weeks[0]).toHaveFocus();
    });

    it("keeps one week in the tab order, the one last focused", async () => {
      // arrange
      const user = userEvent.setup();
      render(<Harness blocks={[FOUNDATION, HYPERTROPHY]} />);
      const weeks = within(
        screen.getByRole("toolbar", { name: "Plan weeks" }),
      ).getAllByRole("button");
      weeks[0].focus();

      // act
      await user.keyboard("{ArrowRight}");

      // assert
      expect(weeks.filter((week) => week.tabIndex === 0)).toEqual([weeks[1]]);
    });
  });

  describe("a plan without blocks", () => {
    it.each([
      {
        level: "beginner" as const,
        suggestion:
          "Suggested for a beginner client: Foundation 4 weeks → Hypertrophy 6 weeks → Deload 1 week",
      },
      {
        level: "intermediate" as const,
        suggestion:
          "Suggested for an intermediate client: Hypertrophy 6 weeks → Deload 1 week → Hypertrophy 6 weeks",
      },
      {
        level: "advanced" as const,
        suggestion:
          "Suggested for an advanced client: Hypertrophy 5 weeks → Deload 1 week → Strength 4 weeks → Deload 1 week",
      },
    ])("suggests the blocks for a $level client", ({ level, suggestion }) => {
      // arrange, act
      render(<Harness blocks={[]} level={level} />);

      // assert
      expect(screen.getByText(suggestion)).toBeVisible();
      expect(
        screen.queryByRole("list", { name: "Blocks" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("toolbar", { name: "Plan weeks" }),
      ).not.toBeInTheDocument();
    });

    it("uses the suggestion when the coach asks", async () => {
      // arrange
      const user = userEvent.setup();
      const onUseSuggestion = vi.fn();
      render(<Harness blocks={[]} onUseSuggestion={onUseSuggestion} />);

      // act
      await user.click(screen.getByRole("button", { name: "Use suggestion" }));

      // assert
      expect(onUseSuggestion).toHaveBeenCalledTimes(1);
    });
  });

  it("titles the overview for assistive technology and shows the settings it is handed", () => {
    // arrange, act
    render(<Harness blocks={[FOUNDATION]} />);

    // assert
    expect(
      screen.getByRole("heading", { level: 2, name: "Plan overview" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Settings slot")).toBeVisible();
  });
});
