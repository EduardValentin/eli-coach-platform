// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  FILLED_FIRST_SESSION,
  newBlock,
  renderWorkspace,
  resetIds,
  session,
  slotGroup,
  stubBrowserApis,
  withTargetMinutes,
} from "~test-support/program-session-harness";

beforeEach(() => {
  resetIds();
  stubBrowserApis();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function lengthOf(sessionName: string): { minutes: number; target: number } {
  const text = within(session(sessionName)).getByText(/of \d+ min$/);
  const [, minutes, target] = /(\d+) of (\d+) min$/.exec(
    text.textContent ?? "",
  )!;

  return { minutes: Number(minutes), target: Number(target) };
}

describe("a session card", () => {
  it("opens the first session and lists the others as one line each, with no cardio card", () => {
    // arrange, act
    renderWorkspace({ block: newBlock(FILLED_FIRST_SESSION) });

    // assert
    expect(
      within(session("Full Body A")).getByRole("textbox", {
        name: "Session name",
      }),
    ).toHaveValue("Full Body A");
    expect(
      within(session("Full Body B")).getByRole("button", {
        name: /^Full Body B\s*0 exercises$/,
      }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(screen.getAllByRole("article", { name: /^Full Body/ })).toHaveLength(
      3,
    );
    expect(
      screen.queryByRole("article", { name: /cardio/i }),
    ).not.toBeInTheDocument();
  });

  it("summarises a collapsed session by its exercise count and length", () => {
    // arrange
    const filledSecond = newBlock({}, FILLED_FIRST_SESSION);

    // act
    renderWorkspace({ block: filledSecond });

    // assert
    expect(
      within(session("Full Body B")).getByRole("button", {
        name: /^Full Body B\s*4 exercises · ~\d+ min$/,
      }),
    ).toBeInTheDocument();
  });

  it("opens a collapsed session, closes the open one and moves focus to the new name", async () => {
    // arrange
    const { user } = renderWorkspace({ block: newBlock(FILLED_FIRST_SESSION) });

    // act
    await user.click(
      within(session("Full Body B")).getByRole("button", {
        name: /^Full Body B/,
      }),
    );

    // assert
    expect(
      within(session("Full Body B")).getByRole("textbox", {
        name: "Session name",
      }),
    ).toHaveFocus();
    expect(
      within(session("Full Body A")).queryByRole("textbox", {
        name: "Session name",
      }),
    ).not.toBeInTheDocument();
    expect(
      within(session("Full Body A")).getByRole("button", {
        name: /^Full Body A/,
      }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("labels its four groups with their place and the patterns of what sits in them", () => {
    // arrange, act
    renderWorkspace({ block: newBlock(FILLED_FIRST_SESSION) });

    // assert
    const headings = within(session("Full Body A"))
      .getAllByRole("heading", { level: 4 })
      .map((heading) => heading.textContent);
    expect(headings).toEqual([
      "Warm-up",
      "A · Main lift",
      "B · Secondary",
      "C · Accessories",
      "D · Core / finisher",
      "Cool-down",
    ]);
    expect(slotGroup("Full Body A", "B · Secondary")).toHaveTextContent(
      "Patterns: Hinge",
    );
    expect(slotGroup("Full Body A", "D · Core / finisher")).toHaveTextContent(
      "Patterns: Core",
    );
  });

  it("names no pattern on an empty group", () => {
    // arrange, act
    renderWorkspace({ block: newBlock({ rows: [["rdl", "B"]] }) });

    // assert
    expect(
      within(slotGroup("Full Body A", "A · Main lift")).queryByText(
        /^Patterns:/,
      ),
    ).not.toBeInTheDocument();
  });

  it("shows its length against the block's target", () => {
    // arrange, act
    renderWorkspace({ block: newBlock(FILLED_FIRST_SESSION) });

    // assert
    const { minutes, target } = lengthOf("Full Body A");
    expect(minutes).toBeGreaterThan(0);
    expect(target).toBe(60);
  });

  it("flags Over target only when the session runs more than ten minutes over", () => {
    // arrange
    const { minutes } = (() => {
      renderWorkspace({ block: newBlock(FILLED_FIRST_SESSION) });
      const read = lengthOf("Full Body A");
      cleanup();
      resetIds();

      return read;
    })();

    // act
    renderWorkspace({
      block: withTargetMinutes(newBlock(FILLED_FIRST_SESSION), minutes - 10),
    });

    // assert
    expect(
      within(session("Full Body A")).queryByText("Over target"),
    ).not.toBeInTheDocument();

    // act
    cleanup();
    resetIds();
    renderWorkspace({
      block: withTargetMinutes(newBlock(FILLED_FIRST_SESSION), minutes - 11),
    });

    // assert
    expect(
      within(session("Full Body A")).getByText("Over target"),
    ).toBeInTheDocument();
  });

  it("renames the session from its name field and from the menu", async () => {
    // arrange
    const { user } = renderWorkspace({ block: newBlock(FILLED_FIRST_SESSION) });
    const name = within(session("Full Body A")).getByRole<HTMLInputElement>(
      "textbox",
      { name: "Session name" },
    );

    // act
    await user.clear(name);
    await user.type(name, "Legs");

    // assert
    expect(session("Legs")).toBeInTheDocument();

    // act
    await user.click(
      within(session("Legs")).getByRole("button", { name: "Legs actions" }),
    );
    await user.click(await screen.findByRole("menuitem", { name: "Rename" }));

    // assert
    expect(name.selectionStart).toBe(0);
    expect(name.selectionEnd).toBe("Legs".length);
  });

  it("clears the exercises after naming them, and keeps the warm-up and cool-down", async () => {
    // arrange
    const { user, changes } = renderWorkspace({
      block: newBlock(FILLED_FIRST_SESSION),
    });
    await user.click(
      within(session("Full Body A")).getByRole("button", {
        name: "Full Body A actions",
      }),
    );

    // act
    await user.click(
      await screen.findByRole("menuitem", { name: "Clear session" }),
    );

    // assert
    const dialog = screen.getByRole("alertdialog", {
      name: "Clear Full Body A?",
    });
    expect(
      within(dialog)
        .getAllByRole("listitem")
        .map((line) => line.textContent),
    ).toEqual(["Full Body A · 4 exercises"]);

    // act
    await user.click(
      within(dialog).getByRole("button", { name: "Clear session" }),
    );

    // assert
    const cleared = changes.at(-1)!.sessions[0];
    expect(cleared.rows).toEqual([]);
    expect(cleared.warmUp.items).toHaveLength(1);
    expect(cleared.coolDown.items).toHaveLength(1);
    expect(await screen.findByText("Full Body A cleared")).toBeInTheDocument();
    expect(
      within(session("Full Body A")).getByRole("region", { name: "Warm-up" }),
    ).toHaveTextContent("90/90 Hip Switches");
    expect(
      within(session("Full Body A")).getByRole("region", {
        name: "Cool-down",
      }),
    ).toHaveTextContent("Couch Stretch");
  });

  it("keeps the exercises when she cancels the clear, and offers nothing to clear on an empty session", async () => {
    // arrange
    const { user, changes } = renderWorkspace({
      block: newBlock(FILLED_FIRST_SESSION),
    });
    await user.click(
      within(session("Full Body A")).getByRole("button", {
        name: "Full Body A actions",
      }),
    );
    await user.click(
      await screen.findByRole("menuitem", { name: "Clear session" }),
    );

    // act
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.click(
      within(session("Full Body B")).getByRole("button", {
        name: /^Full Body B/,
      }),
    );
    await user.click(
      within(session("Full Body B")).getByRole("button", {
        name: "Full Body B actions",
      }),
    );

    // assert
    expect(changes).toEqual([]);
    expect(
      await screen.findByRole("menuitem", { name: "Clear session" }),
    ).toHaveAttribute("data-disabled");
  });
});

describe("adding to a session from the library", () => {
  it("opens the library on the empty group's own add button", async () => {
    // arrange
    const { user, onOpenLibrary } = renderWorkspace({
      block: newBlock(FILLED_FIRST_SESSION),
    });
    await user.click(
      within(session("Full Body B")).getByRole("button", {
        name: /^Full Body B/,
      }),
    );

    // act
    await user.click(
      within(slotGroup("Full Body B", "B · Secondary")).getByRole("button", {
        name: /^Add or drop an exercise\s*in B · Secondary$/,
      }),
    );

    // assert
    expect(onOpenLibrary).toHaveBeenCalledWith({
      kind: "slot",
      sessionId: expect.any(String),
      slot: "B",
    });
  });

  it("opens the library on a group that already holds exercises from its header add button", async () => {
    // arrange
    const { user, onOpenLibrary } = renderWorkspace({
      block: newBlock(FILLED_FIRST_SESSION),
    });

    // act
    await user.click(
      within(slotGroup("Full Body A", "C · Accessories")).getByRole("button", {
        name: "Add exercise to C · Accessories",
      }),
    );

    // assert
    expect(onOpenLibrary).toHaveBeenCalledWith({
      kind: "slot",
      sessionId: expect.any(String),
      slot: "C",
    });
  });

  it("gives a group that holds one exercise only no header add button", () => {
    // arrange, act
    renderWorkspace({ block: newBlock(FILLED_FIRST_SESSION) });

    // assert
    expect(
      within(slotGroup("Full Body A", "A · Main lift")).queryByRole("button", {
        name: /^Add exercise to/,
      }),
    ).not.toBeInTheDocument();
  });

  it("opens the library on the warm-up and on the cool-down from their add buttons", async () => {
    // arrange
    const { user, onOpenLibrary } = renderWorkspace({
      block: newBlock(FILLED_FIRST_SESSION),
    });
    const open = within(session("Full Body A"));

    // act
    await user.click(
      open.getByRole("button", { name: "Add exercise to warm-up" }),
    );
    await user.click(
      open.getByRole("button", { name: "Add stretch to cool-down" }),
    );

    // assert
    expect(onOpenLibrary.mock.calls.map(([target]) => target.kind)).toEqual([
      "warm-up",
      "cool-down",
    ]);
  });
});
