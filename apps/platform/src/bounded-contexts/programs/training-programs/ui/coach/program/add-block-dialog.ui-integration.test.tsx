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
import { useRef, useState } from "react";
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
} from "~/bounded-contexts/programs/training-programs/public/program-editing";
import { matchesNarrowerThan } from "~test-support/viewport";

import { AddBlockDialog } from "./add-block-dialog";

const DESKTOP_WIDTH = 1280;

const SETUP: BlockSetup = {
  splitShape: "full-body",
  trainingDays: 3,
  sessionMinutes: 60,
  dailySteps: 6000,
  language: "en",
};

let nextId = 0;
const suggestions = new ProgramSuggestions({
  libraryExercises: [],
  newId: () => `fixture-${(nextId += 1)}`,
});

function blockOf(type: BlockType, weeks: number): Block {
  return suggestions.newBlock(type, weeks, {
    setup: { ...SETUP, level: "beginner" },
  });
}

type OnAdd = (type: BlockType, weeks: number) => void;

function Opener({
  lastBlock,
  onAdd,
}: {
  lastBlock: Block | undefined;
  onAdd: OnAdd;
}) {
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button onClick={() => setOpen(true)} ref={opener} type="button">
        Open the dialog
      </button>
      <AddBlockDialog
        lastBlock={lastBlock}
        onAdd={(type, weeks) => {
          onAdd(type, weeks);
          setOpen(false);
        }}
        onOpenChange={setOpen}
        open={open}
        returnFocusTo={opener}
      />
    </>
  );
}

async function openDialog(
  lastBlock: Block | undefined,
  onAdd: OnAdd = () => {},
) {
  const user = userEvent.setup();
  render(<Opener lastBlock={lastBlock} onAdd={onAdd} />);
  await user.click(screen.getByRole("button", { name: "Open the dialog" }));
  const dialog = await screen.findByRole("dialog", { name: "Add a block" });

  return { user, dialog };
}

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {};
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.releasePointerCapture = () => {};
  vi.stubGlobal("matchMedia", (query: string) => ({
    addEventListener: () => {},
    matches: matchesNarrowerThan(query, DESKTOP_WIDTH),
    media: query,
    removeEventListener: () => {},
  }));
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

describe("the add-block dialog", () => {
  it.each([
    {
      scenario: "4 weeks of Hypertrophy",
      lastBlock: blockOf("hypertrophy", 4),
      type: "Deload",
      weeks: 1,
    },
    {
      scenario: "6 weeks of Strength",
      lastBlock: blockOf("strength", 6),
      type: "Deload",
      weeks: 1,
    },
    {
      scenario: "3 weeks of Hypertrophy",
      lastBlock: blockOf("hypertrophy", 3),
      type: "Hypertrophy",
      weeks: 4,
    },
    {
      scenario: "4 weeks of Foundation",
      lastBlock: blockOf("foundation", 4),
      type: "Hypertrophy",
      weeks: 4,
    },
    {
      scenario: "a Deload",
      lastBlock: blockOf("deload", 1),
      type: "Hypertrophy",
      weeks: 4,
    },
    {
      scenario: "no block yet",
      lastBlock: undefined,
      type: "Hypertrophy",
      weeks: 4,
    },
  ])(
    "proposes $type for $weeks week after $scenario",
    async ({ lastBlock, type, weeks }) => {
      // arrange, act
      const { dialog } = await openDialog(lastBlock);

      // assert
      expect(
        within(dialog).getByRole("combobox", { name: "Type" }),
      ).toHaveTextContent(type);
      expect(
        within(dialog).getByRole("spinbutton", { name: "Weeks" }),
      ).toHaveValue(weeks);
    },
  );

  it("fixes a Deload at one week and says so", async () => {
    // arrange, act
    const { dialog } = await openDialog(blockOf("strength", 4));

    // assert
    const weeks = within(dialog).getByRole("spinbutton", { name: "Weeks" });
    expect(weeks).toBeDisabled();
    expect(weeks).toHaveAccessibleDescription("A Deload lasts one week");
  });

  it("returns the chosen type and weeks", async () => {
    // arrange
    const onAdd = vi.fn();
    const { user, dialog } = await openDialog(blockOf("foundation", 4), onAdd);

    // act
    await user.click(within(dialog).getByRole("combobox", { name: "Type" }));
    await user.click(await screen.findByRole("option", { name: "Strength" }));
    const weeks = within(dialog).getByRole("spinbutton", { name: "Weeks" });
    await user.clear(weeks);
    await user.type(weeks, "5");
    await user.click(within(dialog).getByRole("button", { name: "Add block" }));

    // assert
    expect(onAdd).toHaveBeenCalledWith("strength", 5);
  });

  it("returns a Deload with one week whatever the weeks field held", async () => {
    // arrange
    const onAdd = vi.fn();
    const { user, dialog } = await openDialog(blockOf("foundation", 4), onAdd);

    // act
    await user.click(within(dialog).getByRole("combobox", { name: "Type" }));
    await user.click(await screen.findByRole("option", { name: "Deload" }));
    await user.click(within(dialog).getByRole("button", { name: "Add block" }));

    // assert
    expect(onAdd).toHaveBeenCalledWith("deload", 1);
  });

  it.each(["0", "2.5"])("cannot add a block of %s weeks", async (typed) => {
    // arrange
    const onAdd = vi.fn();
    const { user, dialog } = await openDialog(blockOf("foundation", 4), onAdd);
    const weeks = within(dialog).getByRole("spinbutton", { name: "Weeks" });

    // act
    await user.clear(weeks);
    await user.type(weeks, typed);

    // assert
    expect(
      within(dialog).getByRole("button", { name: "Add block" }),
    ).toBeDisabled();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("closes on cancel and returns focus to the control that opened it", async () => {
    // arrange
    const { user, dialog } = await openDialog(blockOf("foundation", 4));

    // act
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    // assert
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(
      screen.getByRole("button", { name: "Open the dialog" }),
    ).toHaveFocus();
  });

  it("proposes afresh each time it opens", async () => {
    // arrange
    const { user, dialog } = await openDialog(blockOf("foundation", 4));
    await user.click(within(dialog).getByRole("combobox", { name: "Type" }));
    await user.click(await screen.findByRole("option", { name: "Strength" }));

    // act
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: "Open the dialog" }));

    // assert
    expect(
      within(
        await screen.findByRole("dialog", { name: "Add a block" }),
      ).getByRole("combobox", { name: "Type" }),
    ).toHaveTextContent("Hypertrophy");
  });
});
