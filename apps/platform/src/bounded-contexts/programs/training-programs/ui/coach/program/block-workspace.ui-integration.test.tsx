// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { DndProvider } from "react-dnd";
import { TouchBackend } from "react-dnd-touch-backend";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  ProgramSuggestions,
  type Block,
  type BlockType,
  type ProgramLanguage,
  type Session,
} from "~/bounded-contexts/programs/training-programs/public/program-editing";

import { BlockWorkspace, openSessionIdOf } from "./block-workspace";
import { EditorAnnouncerProvider } from "./editor-announcer";

const SETUP = {
  splitShape: "full-body",
  trainingDays: 3,
  sessionMinutes: 60,
  dailySteps: 6000,
  language: "en",
} as const;

const WEEKDAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const ROW_WIDTH = 900;
const NARROW_WIDTH = 400;

let nextId = 0;
let containerWidth = ROW_WIDTH;

function newId(): string {
  nextId += 1;

  return `id-${nextId}`;
}

function suggestions() {
  return new ProgramSuggestions({ libraryExercises: [], newId });
}

function newBlock(type: BlockType = "hypertrophy"): Block {
  return suggestions().newBlock(type, 4, {
    setup: { ...SETUP, level: "beginner" },
  });
}

function withExercises(block: Block, counts: readonly number[]): Block {
  return {
    ...block,
    sessions: block.sessions.map((session, index) => ({
      ...session,
      rows: Array.from(
        { length: counts[index] ?? 0 },
        (_, row): Session["rows"][number] => ({
          id: `${session.id}-row-${row}`,
          exerciseId: `exercise-${row}`,
          slot: "C",
          startSets: [],
          restSeconds: 60,
          lastSetTechnique: "none",
          substitutions: [],
          progression: { kind: "double" },
          cues: "",
          touched: [],
        }),
      ),
    })),
  };
}

function withoutCardio(block: Block): Block {
  return {
    ...block,
    cardioSessions: [],
    calendar: {
      ...block.calendar,
      tue: { kind: "rest" },
      thu: { kind: "rest" },
      sat: { kind: "rest" },
    },
  };
}

type Arrangement = {
  block: Block;
  language?: ProgramLanguage;
  width?: number;
};

function renderWorkspace({
  block,
  language = "en",
  width = ROW_WIDTH,
}: Arrangement) {
  containerWidth = width;
  const changes: Block[] = [];
  const onRemove = vi.fn();

  function Harness() {
    const [current, setCurrent] = useState(block);
    const [chosen, setChosen] = useState<string>();

    return (
      <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true }}>
        <EditorAnnouncerProvider>
          <BlockWorkspace
            block={current}
            blockIndex={0}
            blocks={[current]}
            language={language}
            level="beginner"
            libraryEquipment={[]}
            libraryExercises={[]}
            libraryTarget={null}
            onChange={(next) => {
              changes.push(next);
              setCurrent(next);
            }}
            onOpenLibrary={() => {}}
            onOpenSession={setChosen}
            onRemove={onRemove}
            openSessionId={openSessionIdOf(current, chosen)}
          />
        </EditorAnnouncerProvider>
      </DndProvider>
    );
  }

  render(<Harness />);

  return { changes, onRemove, user: userEvent.setup() };
}

function week() {
  return screen.getByRole("region", { name: "Week" });
}

function dayCard(weekday: string) {
  const card = within(week())
    .getAllByRole("listitem")
    .find((item) =>
      within(item).queryByRole("button", { name: `${weekday} options` }),
    );
  if (!card) throw new Error(`No day card for ${weekday}`);

  return card;
}

async function openDayMenu(
  user: ReturnType<typeof userEvent.setup>,
  weekday: string,
) {
  await user.click(screen.getByRole("button", { name: `${weekday} options` }));
}

async function chooseDayEntry(
  user: ReturnType<typeof userEvent.setup>,
  weekday: string,
  entry: string,
) {
  await openDayMenu(user, weekday);
  await user.click(screen.getByRole("menuitem", { name: entry }));
}

async function chooseSession(
  user: ReturnType<typeof userEvent.setup>,
  weekday: string,
  session: string,
) {
  const trigger = screen.getByRole("button", { name: `${weekday} options` });
  trigger.focus();
  await user.keyboard("{Enter}");
  await screen.findByRole("menu");
  await user.keyboard("{ArrowDown}{ArrowUp}{ArrowRight}");
  const item = await screen.findByRole("menuitem", { name: session });
  item.focus();
  await user.keyboard("{Enter}");
}

async function chooseOption(
  user: ReturnType<typeof userEvent.setup>,
  select: string,
  option: string,
) {
  await user.click(screen.getByRole("combobox", { name: select }));
  await user.click(screen.getByRole("option", { name: option }));
}

async function chooseBlockAction(
  user: ReturnType<typeof userEvent.setup>,
  action: string,
) {
  await user.click(screen.getByRole("button", { name: "Block actions" }));
  await user.click(screen.getByRole("menuitem", { name: action }));
}

function dialog() {
  return screen.getByRole("alertdialog");
}

function lostLines() {
  return within(dialog())
    .getAllByRole("listitem")
    .map((item) => item.textContent);
}

function plan(weekday: string, name: string) {
  return within(dayCard(weekday)).queryByText(name);
}

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {};
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.releasePointerCapture = () => {};
});

beforeEach(() => {
  nextId = 0;
  vi.stubGlobal("matchMedia", (query: string) => ({
    addEventListener: () => {},
    matches: true,
    media: query,
    removeEventListener: () => {},
  }));
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(private readonly callback: ResizeObserverCallback) {}
      disconnect() {}
      observe() {
        this.callback(
          [{ contentRect: { width: containerWidth } } as ResizeObserverEntry],
          this as unknown as ResizeObserver,
        );
      }
      unobserve() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("the block page's header and settings", () => {
  it("shows the block's number, its type and its settings in one row of fields", () => {
    // arrange, act
    renderWorkspace({ block: newBlock() });

    // assert
    expect(
      screen.getByRole("combobox", { name: "Block type" }),
    ).toHaveTextContent("Hypertrophy");
    expect(
      screen.getByRole("textbox", { name: "Split name" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Weeks" })).toHaveValue(4);
    expect(screen.getByRole("combobox", { name: "Split" })).toHaveTextContent(
      "Full Body",
    );
    expect(
      screen.getByRole("combobox", { name: "Training days" }),
    ).toHaveTextContent("3 days");
    expect(screen.getByRole("combobox", { name: "Target" })).toHaveTextContent(
      "60 min",
    );
    expect(
      screen.getByRole("combobox", { name: "Daily steps" }),
    ).toHaveTextContent("6,000");
  });

  it("outlines the page as the block, then its week, then each day", () => {
    // arrange, act
    renderWorkspace({ block: newBlock() });

    // assert
    expect(
      screen.getByRole("heading", { level: 2, name: "Hypertrophy" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "Week" }),
    ).toBeInTheDocument();
    expect(within(week()).getAllByRole("heading", { level: 4 })).toHaveLength(
      7,
    );
    for (const weekday of WEEKDAY_NAMES) {
      expect(
        screen.getByRole("heading", { level: 4, name: weekday }),
      ).toBeInTheDocument();
    }
  });

  it("offers only Reset to split and Remove block in the block menu", async () => {
    // arrange
    const { user } = renderWorkspace({ block: newBlock() });

    // act
    await user.click(screen.getByRole("button", { name: "Block actions" }));

    // assert
    expect(
      screen.getAllByRole("menuitem").map((item) => item.textContent),
    ).toEqual(["Reset to split", "Remove block"]);
  });

  it("explains the calibration week and lets her switch it on", async () => {
    // arrange
    const { user, changes } = renderWorkspace({ block: newBlock() });
    const calibration = screen.getByRole("switch", {
      name: "Calibration week",
    });
    expect(calibration).not.toBeChecked();

    // act
    await user.click(calibration);

    // assert
    expect(calibration).toBeChecked();
    expect(changes.at(-1)?.calibrationWeek).toBe(true);
    await user.click(
      screen.getByRole("button", { name: "What a calibration week is" }),
    );
    expect(
      await screen.findByText(
        "Week 1 keeps the planned values; she stops 2–3 reps short while finding her weights.",
      ),
    ).toBeInTheDocument();
  });

  it("has no calibration week on a Deload", () => {
    // arrange, act
    renderWorkspace({ block: { ...newBlock("deload"), weeks: 1 } });

    // assert
    expect(
      screen.queryByRole("switch", { name: "Calibration week" }),
    ).not.toBeInTheDocument();
  });

  it("takes the weeks she types and leaves a Deload at one week", async () => {
    // arrange
    const { user, changes } = renderWorkspace({ block: newBlock() });
    const weeks = screen.getByRole("spinbutton", { name: "Weeks" });

    // act
    await user.clear(weeks);
    await user.type(weeks, "6");

    // assert
    expect(changes.at(-1)?.weeks).toBe(6);
  });

  it("fixes the weeks of a Deload and says so", () => {
    // arrange, act
    renderWorkspace({ block: { ...newBlock("deload"), weeks: 1 } });

    // assert
    expect(screen.getByRole("spinbutton", { name: "Weeks" })).toBeDisabled();
    expect(screen.getByText("A deload is always 1 week")).toBeInTheDocument();
  });

  it("makes a block one week long when she turns it into a Deload", async () => {
    // arrange
    const { user, changes } = renderWorkspace({ block: newBlock() });

    // act
    await chooseOption(user, "Block type", "Deload");

    // assert
    expect(changes.at(-1)).toMatchObject({ type: "deload", weeks: 1 });
    expect(screen.getByRole("spinbutton", { name: "Weeks" })).toHaveValue(1);
    expect(
      screen.queryByRole("switch", { name: "Calibration week" }),
    ).not.toBeInTheDocument();
  });

  it("offers two to five training days and the daily steps in thousands", async () => {
    // arrange
    const { user } = renderWorkspace({ block: newBlock() });

    // act
    await user.click(screen.getByRole("combobox", { name: "Training days" }));

    // assert
    expect(
      screen.getAllByRole("option").map((option) => option.textContent),
    ).toEqual(["2 days", "3 days", "4 days", "5 days"]);
  });
});

describe("changing the split", () => {
  it("asks first and names the sessions with exercises it discards", async () => {
    // arrange
    const { user, changes } = renderWorkspace({
      block: withExercises(newBlock(), [2, 1, 0]),
    });

    // act
    await chooseOption(user, "Split", "Upper / Lower");

    // assert
    expect(
      screen.getByRole("alertdialog", { name: "Change the split?" }),
    ).toBeInTheDocument();
    expect(lostLines()).toEqual([
      "Full Body A · 2 exercises",
      "Full Body B · 1 exercise",
    ]);
    expect(changes).toHaveLength(0);
  });

  it("re-lays the week on the new split once she confirms", async () => {
    // arrange
    const { user } = renderWorkspace({
      block: withExercises(newBlock(), [2, 1, 0]),
    });
    await chooseOption(user, "Split", "Upper / Lower");

    // act
    await user.click(screen.getByRole("button", { name: "Rebuild sessions" }));

    // assert
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(plan("Monday", "Lower A")).toBeInTheDocument();
    expect(plan("Wednesday", "Upper A")).toBeInTheDocument();
    expect(plan("Friday", "Lower B")).toBeInTheDocument();
  });

  it("leaves everything as it was and returns focus to the split when she cancels", async () => {
    // arrange
    const { user, changes } = renderWorkspace({
      block: withExercises(newBlock(), [2, 1, 0]),
    });
    await chooseOption(user, "Split", "Upper / Lower");

    // act
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    // assert
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(changes).toHaveLength(0);
    expect(plan("Monday", "Full Body A")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Split" })).toHaveFocus();
  });

  it("applies at once when no session holds an exercise", async () => {
    // arrange
    const { user } = renderWorkspace({ block: newBlock() });

    // act
    await chooseOption(user, "Split", "Upper / Lower");

    // assert
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(plan("Monday", "Lower A")).toBeInTheDocument();
  });
});

describe("changing the training days", () => {
  it("asks first and names the session and the cardio it discards", async () => {
    // arrange
    const { user, changes } = renderWorkspace({
      block: withExercises(newBlock(), [1, 1, 3]),
    });

    // act
    await chooseOption(user, "Training days", "5 days");

    // assert
    expect(
      screen.getByRole("alertdialog", { name: "Change training days?" }),
    ).toBeInTheDocument();
    expect(lostLines()).toEqual(["Moderate cardio · 1 segment"]);
    expect(changes).toHaveLength(0);
  });

  it("names the sessions beyond the new number of days", async () => {
    // arrange
    const { user } = renderWorkspace({
      block: withExercises(newBlock(), [1, 1, 3]),
    });

    // act
    await chooseOption(user, "Training days", "2 days");

    // assert
    expect(lostLines()).toEqual(["Full Body C · 3 exercises"]);
  });

  it("lays the week out again for the new days once she confirms", async () => {
    // arrange
    const { user } = renderWorkspace({
      block: withExercises(newBlock(), [1, 1, 3]),
    });
    await chooseOption(user, "Training days", "2 days");

    // act
    await user.click(screen.getByRole("button", { name: "Rebuild sessions" }));

    // assert
    expect(
      screen.getByRole("combobox", { name: "Training days" }),
    ).toHaveTextContent("2 days");
    expect(plan("Monday", "Full Body A")).toBeInTheDocument();
    expect(plan("Wednesday", "Easy cardio")).toBeInTheDocument();
    expect(plan("Thursday", "Full Body B")).toBeInTheDocument();
  });

  it("returns focus to the training days when she cancels", async () => {
    // arrange
    const { user } = renderWorkspace({
      block: withExercises(newBlock(), [1, 1, 3]),
    });
    await chooseOption(user, "Training days", "2 days");

    // act
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    // assert
    expect(
      screen.getByRole("combobox", { name: "Training days" }),
    ).toHaveFocus();
    expect(
      screen.getByRole("combobox", { name: "Training days" }),
    ).toHaveTextContent("3 days");
  });

  it("applies at once when nothing is lost", async () => {
    // arrange
    const { user } = renderWorkspace({ block: newBlock() });

    // act
    await chooseOption(user, "Training days", "4 days");

    // assert
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Training days" }),
    ).toHaveTextContent("4 days");
    expect(plan("Tuesday", "Full Body B")).toBeInTheDocument();
  });
});

describe("resetting to the split", () => {
  it("asks first and names the sessions it empties", async () => {
    // arrange
    const { user } = renderWorkspace({
      block: withExercises(newBlock(), [4, 0, 2]),
    });

    // act
    await chooseBlockAction(user, "Reset to split");

    // assert
    expect(
      screen.getByRole("alertdialog", { name: "Reset to the split?" }),
    ).toBeInTheDocument();
    expect(lostLines()).toEqual([
      "Full Body A · 4 exercises",
      "Full Body C · 2 exercises",
    ]);
  });

  it("empties the sessions of the split once she confirms", async () => {
    // arrange
    const { user, changes } = renderWorkspace({
      block: withExercises(newBlock(), [4, 0, 2]),
    });
    await chooseBlockAction(user, "Reset to split");

    // act
    await user.click(screen.getByRole("button", { name: "Rebuild sessions" }));

    // assert
    expect(
      changes.at(-1)?.sessions.every((session) => session.rows.length === 0),
    ).toBe(true);
    expect(changes.at(-1)?.split.shape).toBe("full-body");
  });

  it("returns focus to the block menu when she cancels", async () => {
    // arrange
    const { user, changes } = renderWorkspace({
      block: withExercises(newBlock(), [4, 0, 2]),
    });
    await chooseBlockAction(user, "Reset to split");

    // act
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    // assert
    expect(changes).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Block actions" })).toHaveFocus();
  });

  it("applies at once when no session holds an exercise", async () => {
    // arrange
    const { user, changes } = renderWorkspace({ block: newBlock() });

    // act
    await chooseBlockAction(user, "Reset to split");

    // assert
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(changes).toHaveLength(1);
  });
});

describe("removing the block", () => {
  it("asks first and names every session and cardio day that goes with it", async () => {
    // arrange
    const { user, onRemove } = renderWorkspace({
      block: withExercises(newBlock(), [2, 0, 0]),
    });

    // act
    await chooseBlockAction(user, "Remove block");

    // assert
    expect(
      screen.getByRole("alertdialog", { name: "Remove block 1?" }),
    ).toBeInTheDocument();
    expect(lostLines()).toEqual([
      "Full Body A · 2 exercises",
      "Easy cardio · 1 segment",
      "Easy cardio · 1 segment",
      "Moderate cardio · 1 segment",
    ]);
    expect(onRemove).not.toHaveBeenCalled();
  });

  it("removes the block once she confirms", async () => {
    // arrange
    const { user, onRemove } = renderWorkspace({ block: newBlock() });
    await chooseBlockAction(user, "Remove block");

    // act
    await user.click(screen.getByRole("button", { name: "Remove block" }));

    // assert
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});

describe("the week", () => {
  it("shows seven days, each with its plan and how long it takes", () => {
    // arrange, act
    renderWorkspace({ block: newBlock() });

    // assert
    expect(within(week()).getAllByRole("listitem")).toHaveLength(7);
    expect(plan("Monday", "Full Body A")).toBeInTheDocument();
    expect(plan("Tuesday", "Easy cardio")).toBeInTheDocument();
    expect(plan("Wednesday", "Full Body B")).toBeInTheDocument();
    expect(plan("Thursday", "Easy cardio")).toBeInTheDocument();
    expect(plan("Friday", "Full Body C")).toBeInTheDocument();
    expect(plan("Saturday", "Moderate cardio")).toBeInTheDocument();
    expect(plan("Sunday", "Rest")).toBeInTheDocument();
    expect(dayCard("Tuesday")).toHaveTextContent("30 min");
    expect(dayCard("Saturday")).toHaveTextContent("25 min");
  });

  it("reads an empty session as 0 min", () => {
    // arrange, act
    renderWorkspace({ block: newBlock() });

    // assert
    expect(dayCard("Monday")).toHaveTextContent("0 min");
  });

  it("gives a screen reader each day's estimated length", () => {
    // arrange, act
    renderWorkspace({ block: newBlock() });

    // assert
    const spoken = within(dayCard("Monday")).getByText("about 0 min");
    expect(spoken.closest("[aria-hidden='true']")).toBeNull();
    expect(dayCard("Tuesday")).toHaveTextContent("30 min");
  });

  it("gives a rest day no length", () => {
    // arrange, act
    renderWorkspace({ block: newBlock() });

    // assert
    expect(dayCard("Sunday")).not.toHaveTextContent("min");
  });

  it.each(["Tuesday", "Sunday"])(
    "makes the options menu the only control on %s's card, which opens nothing",
    (weekday) => {
      // arrange, act
      renderWorkspace({ block: newBlock() });

      // assert
      expect(
        within(dayCard(weekday))
          .getAllByRole("button")
          .map((button) => button.getAttribute("aria-label")),
      ).toEqual([`${weekday} options`]);
    },
  );

  it("gives a strength day's card one control to open its session beside its options menu", () => {
    // arrange, act
    renderWorkspace({ block: newBlock() });

    // assert
    const buttons = within(dayCard("Monday")).getAllByRole("button");
    expect(buttons).toHaveLength(2);
    expect(
      within(dayCard("Monday")).getByRole("button", {
        name: /^Full Body A\s*about 0 min$/,
      }),
    ).toBeInTheDocument();
    expect(
      within(dayCard("Monday")).getByRole("button", {
        name: "Monday options",
      }),
    ).toBeInTheDocument();
  });

  it("shows a cardio face as plain text, not a button", () => {
    // arrange, act
    renderWorkspace({ block: newBlock() });

    // assert
    expect(
      within(dayCard("Tuesday")).queryByRole("button", { name: /Easy cardio/ }),
    ).not.toBeInTheDocument();
    expect(plan("Tuesday", "Easy cardio")).toBeInTheDocument();
  });

  it("cues a hover on a strength or rest day's card and on no cardio card", () => {
    // arrange, act
    renderWorkspace({ block: newBlock() });

    // assert
    const card = (weekday: string) => dayCard(weekday).firstElementChild;
    expect(card("Monday")).toHaveClass("hover:bg-surface-subtle");
    expect(card("Sunday")).toHaveClass("hover:bg-surface-muted-hover");
    expect(card("Tuesday")?.className).not.toMatch(/hover:/);
  });

  it("opens a strength day's session below the week and scrolls to it", async () => {
    // arrange
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    const { user } = renderWorkspace({ block: newBlock() });
    expect(
      within(screen.getByRole("article", { name: "Full Body B" })).queryByRole(
        "textbox",
        { name: "Session name" },
      ),
    ).not.toBeInTheDocument();

    // act
    await user.click(
      within(dayCard("Wednesday")).getByRole("button", {
        name: /^Full Body B/,
      }),
    );

    // assert
    expect(
      within(screen.getByRole("article", { name: "Full Body B" })).getByRole(
        "textbox",
        { name: "Session name" },
      ),
    ).toBeInTheDocument();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(
      screen.getByRole("article", { name: "Full Body B" }),
    );
  });

  it("opens the first strength session by default and lists no cardio card", () => {
    // arrange, act
    renderWorkspace({ block: newBlock() });

    // assert
    expect(
      within(screen.getByRole("article", { name: "Full Body A" })).getByRole(
        "textbox",
        { name: "Session name" },
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("article", { name: /cardio/i }),
    ).not.toBeInTheDocument();
  });

  it("opens the first strength session listed when a cardio day comes first in the week", async () => {
    // arrange
    const { user } = renderWorkspace({ block: newBlock() });

    // act
    await chooseDayEntry(user, "Monday", "Cardio");

    // assert
    expect(
      within(screen.getByRole("article", { name: "Full Body B" })).getByRole(
        "textbox",
        { name: "Session name" },
      ),
    ).toBeInTheDocument();
  });

  it("shows a day at a time with the rail choosing the day when the container is narrow", async () => {
    // arrange
    const { user } = renderWorkspace({
      block: newBlock(),
      width: NARROW_WIDTH,
    });
    const days = screen.getByRole("tablist", { name: "Days" });

    // act
    await user.click(within(days).getByRole("tab", { name: /^Tuesday/ }));

    // assert
    expect(within(days).getAllByRole("tab")).toHaveLength(7);
    expect(
      screen.getByRole("heading", { level: 4, name: "Tuesday" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tabpanel")).toHaveTextContent(
      "Easy cardio · 30 min",
    );
    expect(within(week()).queryAllByRole("heading", { level: 4 })).toHaveLength(
      1,
    );
  });

  it("offers to open a session from a strength day's one-day panel and not from a cardio day's", async () => {
    // arrange
    const { user } = renderWorkspace({
      block: newBlock(),
      width: NARROW_WIDTH,
    });
    const days = screen.getByRole("tablist", { name: "Days" });

    // assert
    expect(
      within(screen.getByRole("tabpanel"))
        .getAllByRole("button")
        .map(
          (button) => button.getAttribute("aria-label") ?? button.textContent,
        ),
    ).toEqual(["Monday options", "Open session"]);

    // act
    await user.click(within(days).getByRole("tab", { name: /^Tuesday/ }));

    // assert
    expect(
      screen.queryByRole("button", { name: "Open session" }),
    ).not.toBeInTheDocument();
  });

  it("opens the day's session from the one-day panel", async () => {
    // arrange
    const { user } = renderWorkspace({
      block: newBlock(),
      width: NARROW_WIDTH,
    });
    const days = screen.getByRole("tablist", { name: "Days" });
    await user.click(within(days).getByRole("tab", { name: /^Wednesday/ }));

    // act
    await user.click(screen.getByRole("button", { name: "Open session" }));

    // assert
    expect(
      within(screen.getByRole("article", { name: "Full Body B" })).getByRole(
        "textbox",
        { name: "Session name" },
      ),
    ).toBeInTheDocument();
  });

  it("starts the one-day panel on the first strength day", () => {
    // arrange, act
    renderWorkspace({ block: newBlock(), width: NARROW_WIDTH });

    // assert
    expect(screen.getByRole("tabpanel")).toHaveTextContent(
      "Full Body A · 0 min",
    );
  });
});

describe("changing a day from its menu", () => {
  it("lists the block's sessions under Session", async () => {
    // arrange
    const { user } = renderWorkspace({ block: newBlock() });

    // act
    await openDayMenu(user, "Sunday");
    await user.click(screen.getByRole("menuitem", { name: "Session" }));

    // assert
    expect(
      (await screen.findAllByRole("menuitem")).map((item) => item.textContent),
    ).toEqual([
      "Session",
      "Cardio",
      "Rest",
      "Full Body A",
      "Full Body B",
      "Full Body C",
    ]);
  });

  it("puts a session on a rest day at once and leaves the day it left as rest", async () => {
    // arrange
    const { user } = renderWorkspace({ block: newBlock() });

    // act
    await chooseSession(user, "Sunday", "Full Body A");

    // assert
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(plan("Sunday", "Full Body A")).toBeInTheDocument();
    expect(plan("Monday", "Rest")).toBeInTheDocument();
  });

  it("asks before putting a session over a cardio day and names the cardio it discards", async () => {
    // arrange
    const { user, changes } = renderWorkspace({ block: newBlock() });

    // act
    await chooseSession(user, "Tuesday", "Full Body A");

    // assert
    expect(
      screen.getByRole("alertdialog", { name: "Put Full Body A on Tuesday?" }),
    ).toBeInTheDocument();
    expect(lostLines()).toEqual(["Easy cardio · 1 segment"]);
    expect(changes).toHaveLength(0);
  });

  it("moves the session once she confirms, leaving the day it left as rest", async () => {
    // arrange
    const { user } = renderWorkspace({ block: newBlock() });
    await chooseSession(user, "Tuesday", "Full Body A");

    // act
    await user.click(screen.getByRole("button", { name: "Change day" }));

    // assert
    expect(plan("Tuesday", "Full Body A")).toBeInTheDocument();
    expect(plan("Monday", "Rest")).toBeInTheDocument();
  });

  it("makes a rest day a cardio day with no length at once", async () => {
    // arrange
    const { user } = renderWorkspace({ block: newBlock() });

    // act
    await chooseDayEntry(user, "Sunday", "Cardio");

    // assert
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(plan("Sunday", "Cardio")).toBeInTheDocument();
    expect(dayCard("Sunday")).not.toHaveTextContent("min");
  });

  it("asks before making a day with exercises a cardio day and names what it discards", async () => {
    // arrange
    const { user } = renderWorkspace({
      block: withExercises(newBlock(), [3, 0, 0]),
    });

    // act
    await chooseDayEntry(user, "Monday", "Cardio");

    // assert
    expect(
      screen.getByRole("alertdialog", { name: "Make Monday a cardio day?" }),
    ).toBeInTheDocument();
    expect(lostLines()).toEqual(["Full Body A · 3 exercises"]);
  });

  it("keeps a cardio day's content when she chooses Cardio for it again", async () => {
    // arrange
    const { user } = renderWorkspace({ block: newBlock() });

    // act
    await chooseDayEntry(user, "Tuesday", "Cardio");

    // assert
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(plan("Tuesday", "Easy cardio")).toBeInTheDocument();
  });

  it("asks before making a cardio day a rest day and names its segments", async () => {
    // arrange
    const { user } = renderWorkspace({ block: newBlock() });

    // act
    await chooseDayEntry(user, "Tuesday", "Rest");

    // assert
    expect(
      screen.getByRole("alertdialog", { name: "Make Tuesday a rest day?" }),
    ).toBeInTheDocument();
    expect(lostLines()).toEqual(["Easy cardio · 1 segment"]);
  });

  it("makes the day rest once she confirms", async () => {
    // arrange
    const { user } = renderWorkspace({ block: newBlock() });
    await chooseDayEntry(user, "Tuesday", "Rest");

    // act
    await user.click(screen.getByRole("button", { name: "Change day" }));

    // assert
    expect(plan("Tuesday", "Rest")).toBeInTheDocument();
  });

  it("returns focus to the day's options when she cancels", async () => {
    // arrange
    const { user } = renderWorkspace({ block: newBlock() });
    await chooseDayEntry(user, "Tuesday", "Rest");

    // act
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    // assert
    expect(plan("Tuesday", "Easy cardio")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Tuesday options" }),
    ).toHaveFocus();
  });

  it("applies a rest day at once when the day holds nothing", async () => {
    // arrange
    const { user } = renderWorkspace({ block: withoutCardio(newBlock()) });

    // act
    await chooseDayEntry(user, "Monday", "Rest");

    // assert
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(plan("Monday", "Rest")).toBeInTheDocument();
  });
});
