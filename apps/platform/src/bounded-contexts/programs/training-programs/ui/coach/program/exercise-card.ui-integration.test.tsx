// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  dragOnto,
  emptyDropTarget,
  exerciseCard,
  gripOf,
  libraryItem,
  newBlock,
  positions,
  renderWorkspace,
  resetIds,
  slotGroup,
  stopPointingAt,
  stubBrowserApis,
} from "~test-support/program-session-harness";

const SESSION = "Full Body A";

const ACCESSORIES = newBlock({
  rows: [
    ["squat", "A"],
    ["lateral", "C"],
    ["curl", "C"],
    ["plank", "D"],
  ],
});

beforeEach(() => {
  resetIds();
  stubBrowserApis();
});

afterEach(() => {
  cleanup();
  stopPointingAt();
  vi.unstubAllGlobals();
});

function setStats(card: HTMLElement): string[] {
  const terms = within(card).getAllByRole("term");
  const values = within(card).getAllByRole("definition");

  return terms.map(
    (term, index) => `${term.textContent} ${values[index].textContent}`,
  );
}

function actionsOf(name: string): HTMLElement {
  return within(exerciseCard(SESSION, new RegExp(`${name}$`))).getByRole(
    "button",
    { name: `${name} actions` },
  );
}

describe("an exercise card", () => {
  it("offers Details only, with the first week's targets and no Sets disclosure or reset", async () => {
    // arrange
    const { user } = renderWorkspace({ block: ACCESSORIES });
    const main = exerciseCard(SESSION, /^A /);

    // act
    await user.click(within(main).getByRole("button", { name: /actions$/ }));

    // assert
    expect(
      within(main).getAllByRole("button", { name: /for Back Squat$/ }),
    ).toHaveLength(1);
    expect(
      within(main).getByRole("button", { name: /^Details\s*for Back Squat$/ }),
    ).toBeInTheDocument();
    expect(
      within(main).queryByRole("button", { name: /^Sets\s*for / }),
    ).not.toBeInTheDocument();
    expect(setStats(main)).toEqual([
      "Warm-up 2 sets",
      "Working 4 sets × 6–10",
      "RIR 2–3",
      "Rest 2:30",
    ]);
    expect(
      await screen.findByRole("menuitem", { name: "Remove" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: "Reset to block defaults" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: /progression/i }),
    ).not.toBeInTheDocument();
  });

  it("names its position and exercise, and sets two exercises of one group apart as a superset", async () => {
    // arrange
    const { user } = renderWorkspace({ block: ACCESSORIES });
    expect(positions(SESSION)).toEqual(["A", "C", "C", "D"]);

    // act
    await user.click(actionsOf("Lateral Raises"));
    await user.click(
      await screen.findByRole("menuitem", { name: "Superset with next" }),
    );

    // assert
    expect(positions(SESSION)).toEqual(["A", "C1", "C2", "D"]);
    expect(
      within(slotGroup(SESSION, "C · Accessories")).getByText("Superset"),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(
        "Lateral Raises and Biceps Curl grouped as a superset",
      ),
    ).toBeInTheDocument();
    expect(actionsOf("Lateral Raises")).toHaveFocus();
  });

  it("ungroups a superset, announces it and focuses the first exercise's menu", async () => {
    // arrange
    const { user } = renderWorkspace({ block: ACCESSORIES });
    await user.click(actionsOf("Lateral Raises"));
    await user.click(
      await screen.findByRole("menuitem", { name: "Superset with next" }),
    );

    // act
    await user.click(
      within(slotGroup(SESSION, "C · Accessories")).getByRole("button", {
        name: /^Ungroup\s*C1 and C2$/,
      }),
    );

    // assert
    expect(positions(SESSION)).toEqual(["A", "C", "C", "D"]);
    expect(await screen.findByText("C1 and C2 ungrouped")).toBeInTheDocument();
    expect(actionsOf("Lateral Raises")).toHaveFocus();
  });

  it("offers no superset in a group that holds a single exercise", async () => {
    // arrange
    const { user } = renderWorkspace({ block: ACCESSORIES });

    // act
    await user.click(actionsOf("Back Squat"));

    // assert
    expect(
      screen.queryByRole("menuitem", { name: "Superset with next" }),
    ).not.toBeInTheDocument();
    expect(
      await screen.findByRole("menuitem", { name: "Move down" }),
    ).toHaveAttribute("data-disabled");
  });

  it("moves an exercise up and down inside its group, keeps focus on it and announces it", async () => {
    // arrange
    const { user } = renderWorkspace({ block: ACCESSORIES });

    // act
    await user.click(actionsOf("Biceps Curl"));
    await user.click(await screen.findByRole("menuitem", { name: "Move up" }));

    // assert
    expect(
      within(slotGroup(SESSION, "C · Accessories"))
        .getAllByRole("article")
        .map((card) => card.getAttribute("aria-label")),
    ).toEqual(["C Biceps Curl", "C Lateral Raises"]);
    expect(await screen.findByText("Biceps Curl moved up")).toBeInTheDocument();
    expect(actionsOf("Biceps Curl")).toHaveFocus();

    // act
    await user.keyboard("{Enter}");
    await user.click(
      await screen.findByRole("menuitem", { name: "Move down" }),
    );

    // assert
    expect(
      await screen.findByText("Biceps Curl moved down"),
    ).toBeInTheDocument();
    expect(actionsOf("Biceps Curl")).toHaveFocus();
  });

  it("moves an exercise to another group from its menu, announcing where it went", async () => {
    // arrange
    const { user } = renderWorkspace({ block: ACCESSORIES });

    // act
    await user.click(actionsOf("Biceps Curl"));
    await user.click(
      await screen.findByRole("menuitem", { name: "Move to B · Secondary" }),
    );

    // assert
    expect(
      within(slotGroup(SESSION, "B · Secondary")).getByRole("article", {
        name: "B Biceps Curl",
      }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Biceps Curl moved to B · Secondary"),
    ).toBeInTheDocument();
    expect(actionsOf("Biceps Curl")).toHaveFocus();
  });

  it("offers no move to a main-lift or secondary group that is already taken", async () => {
    // arrange
    const { user } = renderWorkspace({ block: ACCESSORIES });

    // act
    await user.click(actionsOf("Lateral Raises"));

    // assert
    expect(
      await screen.findByRole("menuitem", { name: "Move to B · Secondary" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: /^Move to A / }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: "Move to C · Accessories" }),
    ).not.toBeInTheDocument();
  });

  it("removes an exercise, focusing the next one, then the group's add button when none is left", async () => {
    // arrange
    const { user } = renderWorkspace({ block: ACCESSORIES });

    // act
    await user.click(actionsOf("Lateral Raises"));
    await user.click(await screen.findByRole("menuitem", { name: "Remove" }));

    // assert
    expect(
      await screen.findByText("Lateral Raises removed"),
    ).toBeInTheDocument();
    expect(actionsOf("Biceps Curl")).toHaveFocus();

    // act
    await user.keyboard("{Enter}");
    await user.click(await screen.findByRole("menuitem", { name: "Remove" }));

    // assert
    expect(
      within(slotGroup(SESSION, "C · Accessories")).getByRole("button", {
        name: /^Add or drop an exercise\s*in C · Accessories$/,
      }),
    ).toHaveFocus();
  });
});

describe("an exercise card's Details", () => {
  it("shows the suggested substitutions, removes them and suggests them again", async () => {
    // arrange
    const { user } = renderWorkspace({ block: ACCESSORIES });
    const main = exerciseCard(SESSION, /^A /);
    await user.click(
      within(main).getByRole("button", { name: /^Details\s*for Back Squat$/ }),
    );
    const substitutions = within(main).getByRole("group", {
      name: "Substitutions",
    });
    const removes = within(substitutions).getAllByRole("button", {
      name: /^Remove /,
    });
    expect(removes).toHaveLength(2);

    // act
    for (const remove of removes) await user.click(remove);

    // assert
    expect(
      within(substitutions).queryAllByRole("button", { name: /^Remove / }),
    ).toHaveLength(0);

    // act
    await user.click(
      within(substitutions).getByRole("button", { name: "Suggest" }),
    );

    // assert
    expect(
      within(substitutions).getAllByRole("button", { name: /^Remove / }),
    ).toHaveLength(2);
  });

  it("opens the library for a substitution from its add button", async () => {
    // arrange
    const { user, onOpenLibrary } = renderWorkspace({ block: ACCESSORIES });
    const main = exerciseCard(SESSION, /^A /);
    await user.click(
      within(main).getByRole("button", { name: /^Details\s*for Back Squat$/ }),
    );
    const substitutions = within(main).getByRole("group", {
      name: "Substitutions",
    });
    await user.click(
      within(substitutions).getAllByRole("button", { name: /^Remove / })[0],
    );

    // act
    await user.click(
      within(substitutions).getByRole("button", {
        name: "Add substitution for Back Squat",
      }),
    );

    // assert
    expect(onOpenLibrary).toHaveBeenCalledWith({
      kind: "substitution",
      sessionId: expect.any(String),
      rowId: expect.any(String),
    });
  });

  it("adds a substitution dropped from the library", async () => {
    // arrange
    const { user } = renderWorkspace({ block: ACCESSORIES });
    const main = exerciseCard(SESSION, /^A /);
    await user.click(
      within(main).getByRole("button", { name: /^Details\s*for Back Squat$/ }),
    );
    const substitutions = within(main).getByRole("group", {
      name: "Substitutions",
    });
    await user.click(
      within(substitutions).getAllByRole("button", { name: /^Remove / })[0],
    );

    // act
    dragOnto(
      libraryItem("Goblet Squat"),
      substitutions.parentElement as HTMLElement,
    );

    // assert
    expect(
      within(substitutions).getByRole("button", {
        name: "Remove Goblet Squat",
      }),
    ).toBeInTheDocument();
  });

  it("takes the cues from the library again after she changed them", async () => {
    // arrange
    const { user } = renderWorkspace({ block: ACCESSORIES });
    const main = exerciseCard(SESSION, /^A /);
    await user.click(
      within(main).getByRole("button", { name: /^Details\s*for Back Squat$/ }),
    );
    const cues = within(main).getByRole("textbox", { name: "Cues" });
    expect(cues).toHaveValue("Brace\nDrive through the floor");
    await user.clear(cues);
    await user.type(cues, "Chest up");

    // act
    await user.click(
      within(main).getByRole("button", { name: "Reset cues from library" }),
    );

    // assert
    expect(within(main).getByRole("textbox", { name: "Cues" })).toHaveValue(
      "Brace\nDrive through the floor",
    );
  });

  it("sets a custom progression with its own text", async () => {
    // arrange
    const { user, changes } = renderWorkspace({ block: ACCESSORIES });
    const main = exerciseCard(SESSION, /^A /);
    await user.click(
      within(main).getByRole("button", { name: /^Details\s*for Back Squat$/ }),
    );

    // act
    await user.click(
      within(main).getByRole("combobox", { name: "Progression" }),
    );
    await user.click(await screen.findByRole("option", { name: "Custom" }));
    await user.type(
      within(main).getByRole("textbox", { name: "Custom progression" }),
      "Add 2.5 kg when all sets hit 10",
    );

    // assert
    expect(changes.at(-1)!.sessions[0].rows[0].progression).toEqual({
      kind: "custom",
      text: "Add 2.5 kg when all sets hit 10",
    });
  });

  it("sets the tempo and the last-set technique", async () => {
    // arrange
    const { user, changes } = renderWorkspace({ block: ACCESSORIES });
    const main = exerciseCard(SESSION, /^A /);
    await user.click(
      within(main).getByRole("button", { name: /^Details\s*for Back Squat$/ }),
    );

    // act
    await user.type(
      within(main).getByRole("textbox", { name: "Tempo" }),
      "3-1-1",
    );
    await user.click(within(main).getByRole("combobox", { name: "Last set" }));
    await user.click(await screen.findByRole("option", { name: "Drop set" }));

    // assert
    const [row] = changes.at(-1)!.sessions[0].rows;
    expect(row.tempo).toBe("3-1-1");
    expect(row.lastSetTechnique).toBe("drop-set");
  });
});

describe("dropping onto the session", () => {
  it("adds a library exercise dragged into an empty group", () => {
    // arrange
    renderWorkspace({ block: newBlock({ rows: [["squat", "A"]] }) });

    // act
    dragOnto(
      libraryItem("Dumbbell Rows"),
      emptyDropTarget(slotGroup(SESSION, "C · Accessories")),
    );

    // assert
    expect(
      within(slotGroup(SESSION, "C · Accessories")).getByRole("article", {
        name: "C Dumbbell Rows",
      }),
    ).toBeInTheDocument();
  });

  it("makes a superset of a library exercise dropped on an accessory", () => {
    // arrange
    renderWorkspace({ block: ACCESSORIES });

    // act
    dragOnto(
      libraryItem("Dumbbell Rows"),
      exerciseCard(SESSION, /^C Lateral Raises$/),
    );

    // assert
    expect(positions(SESSION)).toEqual(["A", "C1", "C2", "C", "D"]);
  });

  it("sends a library exercise dropped on a full main-lift or secondary group to the next group", () => {
    // arrange
    renderWorkspace({ block: ACCESSORIES });

    // act
    dragOnto(libraryItem("Romanian Deadlift"), exerciseCard(SESSION, /^A /));

    // assert
    expect(
      within(slotGroup(SESSION, "B · Secondary")).getByRole("article", {
        name: "B Romanian Deadlift",
      }),
    ).toBeInTheDocument();
    expect(positions(SESSION)).toEqual(["A", "B", "C", "C", "D"]);
  });

  it("swaps the main lift with the exercise of a full secondary group when one is dragged onto the other", () => {
    // arrange
    renderWorkspace({
      block: newBlock({
        rows: [
          ["squat", "A"],
          ["rdl", "B"],
        ],
      }),
    });

    // act
    dragOnto(
      gripOf(exerciseCard(SESSION, /^A /)),
      exerciseCard(SESSION, /^B /),
    );

    // assert
    expect(
      within(slotGroup(SESSION, "A · Main lift")).getByRole("article", {
        name: "A Romanian Deadlift",
      }),
    ).toBeInTheDocument();
    expect(
      within(slotGroup(SESSION, "B · Secondary")).getByRole("article", {
        name: "B Back Squat",
      }),
    ).toBeInTheDocument();
  });

  it("makes a superset of an accessory dragged onto another", () => {
    // arrange
    renderWorkspace({ block: ACCESSORIES });

    // act
    dragOnto(
      gripOf(exerciseCard(SESSION, /^C Biceps Curl$/)),
      exerciseCard(SESSION, /^C Lateral Raises$/),
    );

    // assert
    expect(positions(SESSION)).toEqual(["A", "C1", "C2", "D"]);
  });
});
