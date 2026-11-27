// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, screen, waitFor, within } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  dragOnto,
  libraryItem,
  newBlock,
  renderWorkspace,
  resetIds,
  session,
  stopPointingAt,
  stubBrowserApis,
} from "~test-support/program-session-harness";

const SESSION = "Full Body A";

beforeEach(() => {
  resetIds();
  stubBrowserApis();
});

afterEach(() => {
  cleanup();
  stopPointingAt();
  vi.unstubAllGlobals();
});

function warmUp(): HTMLElement {
  return within(session(SESSION)).getByRole("region", { name: "Warm-up" });
}

function coolDown(): HTMLElement {
  return within(session(SESSION)).getByRole("region", { name: "Cool-down" });
}

async function retype(
  user: ReturnType<typeof userEvent.setup>,
  field: HTMLElement,
  text: string,
) {
  await user.clear(field);
  await user.type(field, text);
}

function warmUpNames(): string[] {
  return within(warmUp())
    .queryAllByRole("button", { name: / actions$/ })
    .map((button) =>
      button.getAttribute("aria-label")!.replace(" actions", ""),
    );
}

describe("the warm-up", () => {
  it("edits an exercise's sets and reps", async () => {
    // arrange
    const { user } = renderWorkspace({
      block: newBlock({ warmUp: ["hips"] }),
    });
    expect(
      within(warmUp()).getByRole("textbox", {
        name: "90/90 Hip Switches reps",
      }),
    ).toHaveValue("10");

    // act
    await retype(
      user,
      within(warmUp()).getByRole("spinbutton", {
        name: "90/90 Hip Switches sets",
      }),
      "2",
    );
    await retype(
      user,
      within(warmUp()).getByRole("textbox", {
        name: "90/90 Hip Switches reps",
      }),
      "8",
    );

    // assert
    expect(
      within(warmUp()).getByRole("spinbutton", {
        name: "90/90 Hip Switches sets",
      }),
    ).toHaveValue(2);
    expect(
      within(warmUp()).getByRole("textbox", {
        name: "90/90 Hip Switches reps",
      }),
    ).toHaveValue("8");
  });

  it("names the set count in the singular for one set", () => {
    // arrange, act
    renderWorkspace({ block: newBlock({ warmUp: ["hips"] }) });

    // assert
    expect(
      within(warmUp()).getByRole("spinbutton", {
        name: "90/90 Hip Switches sets",
      }),
    ).toHaveAccessibleDescription("set ×");
  });

  it("flags reps she cannot be read as a number or range", async () => {
    // arrange
    const { user } = renderWorkspace({
      block: newBlock({ warmUp: ["hips"] }),
    });
    const reps = within(warmUp()).getByRole("textbox", {
      name: "90/90 Hip Switches reps",
    });

    // act
    await retype(user, reps, "lots");
    await user.tab();

    // assert
    expect(reps).toBeInvalid();
    expect(reps).toHaveAccessibleDescription(
      "reps Use a number or a range like 8–12",
    );
  });

  it("gives a timed exercise a seconds field with a default of 45", () => {
    // arrange, act
    renderWorkspace({ block: newBlock({ warmUp: ["jacks"] }) });

    // assert
    expect(
      within(warmUp()).getByRole("spinbutton", {
        name: "Jumping Jacks seconds",
      }),
    ).toHaveValue(45);
  });

  it("removes an exercise, handing focus to the next and then to Add exercise once the list is empty", async () => {
    // arrange
    const { user } = renderWorkspace({
      block: newBlock({ warmUp: ["hips", "circles"] }),
    });

    // act
    await user.click(
      within(warmUp()).getByRole("button", {
        name: "90/90 Hip Switches actions",
      }),
    );
    await user.click(await screen.findByRole("menuitem", { name: "Remove" }));

    // assert
    expect(
      await screen.findByText("90/90 Hip Switches removed"),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        within(warmUp()).getByRole("button", { name: "Arm Circles actions" }),
      ).toHaveFocus(),
    );

    // act
    await user.keyboard("{Enter}");
    await user.click(await screen.findByRole("menuitem", { name: "Remove" }));

    // assert
    await waitFor(() =>
      expect(
        within(warmUp()).getByRole("button", {
          name: "Add exercise to warm-up",
        }),
      ).toHaveFocus(),
    );
  });

  it("moves an exercise up and down, announcing it and keeping focus on its menu", async () => {
    // arrange
    const { user } = renderWorkspace({
      block: newBlock({ warmUp: ["hips", "circles"] }),
    });

    // act
    await user.click(
      within(warmUp()).getByRole("button", { name: "Arm Circles actions" }),
    );
    await user.click(await screen.findByRole("menuitem", { name: "Move up" }));

    // assert
    expect(warmUpNames()).toEqual(["Arm Circles", "90/90 Hip Switches"]);
    expect(await screen.findByText("Arm Circles moved up")).toBeInTheDocument();
    expect(
      within(warmUp()).getByRole("button", { name: "Arm Circles actions" }),
    ).toHaveFocus();
  });

  it("takes at most four exercises, and none twice, when they are dropped from the library", () => {
    // arrange
    renderWorkspace({
      block: newBlock({ warmUp: ["hips", "circles", "cat"] }),
    });

    // act
    dragOnto(libraryItem("90/90 Hip Switches"), warmUp());

    // assert
    expect(warmUpNames()).toEqual([
      "90/90 Hip Switches",
      "Arm Circles",
      "Cat Cow",
    ]);

    // act
    dragOnto(libraryItem("Jumping Jacks"), warmUp());

    // assert
    expect(warmUpNames()).toEqual([
      "90/90 Hip Switches",
      "Arm Circles",
      "Cat Cow",
      "Jumping Jacks",
    ]);

    // act
    dragOnto(libraryItem("Skipping"), warmUp());

    // assert
    expect(warmUpNames()).toHaveLength(4);
    expect(warmUpNames()).not.toContain("Skipping");
  });

  it("names its icon-only add action in full", () => {
    // arrange, act
    renderWorkspace({ block: newBlock({ warmUp: ["hips"] }) });

    // assert
    expect(
      within(session(SESSION)).getByRole("button", {
        name: "Add exercise to warm-up",
      }),
    ).toHaveTextContent("");
  });
});

describe("the cool-down", () => {
  it("is off until she switches it on, with no add action while it is off", async () => {
    // arrange
    const { user } = renderWorkspace({ block: newBlock({}) });
    expect(
      within(session(SESSION)).queryByRole("button", {
        name: "Add stretch to cool-down",
      }),
    ).not.toBeInTheDocument();

    // act
    await user.click(
      within(session(SESSION)).getByRole("switch", { name: "Cool-down" }),
    );

    // assert
    expect(
      within(session(SESSION)).getByRole("button", {
        name: "Add stretch to cool-down",
      }),
    ).toBeInTheDocument();
    expect(within(coolDown()).queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("keeps its stretches while it is switched off and brings them back when it is switched on", async () => {
    // arrange
    const { user } = renderWorkspace({
      block: newBlock({ coolDown: { enabled: true, items: ["couch"] } }),
    });
    const toggle = within(session(SESSION)).getByRole("switch", {
      name: "Cool-down",
    });
    expect(
      within(coolDown()).getByRole("spinbutton", {
        name: "Couch Stretch seconds",
      }),
    ).toHaveValue(30);

    // act
    await user.click(toggle);

    // assert
    expect(
      within(coolDown()).queryByRole("spinbutton", {
        name: "Couch Stretch seconds",
      }),
    ).not.toBeInTheDocument();

    // act
    await user.click(toggle);

    // assert
    expect(
      within(coolDown()).getByRole("spinbutton", {
        name: "Couch Stretch seconds",
      }),
    ).toHaveValue(30);
  });

  it("edits a stretch's seconds", async () => {
    // arrange
    const { user } = renderWorkspace({
      block: newBlock({ coolDown: { enabled: true, items: ["couch"] } }),
    });

    // act
    await retype(
      user,
      within(coolDown()).getByRole("spinbutton", {
        name: "Couch Stretch seconds",
      }),
      "45",
    );

    // assert
    expect(
      within(coolDown()).getByRole("spinbutton", {
        name: "Couch Stretch seconds",
      }),
    ).toHaveValue(45);
  });

  it("takes stretches dropped from the library and nothing else", () => {
    // arrange
    renderWorkspace({
      block: newBlock({ coolDown: { enabled: true, items: ["couch"] } }),
    });

    // act
    dragOnto(libraryItem("Dumbbell Rows"), coolDown());

    // assert
    expect(
      within(coolDown()).queryByRole("spinbutton", {
        name: "Dumbbell Rows seconds",
      }),
    ).not.toBeInTheDocument();

    // act
    dragOnto(libraryItem("Hamstring Stretch"), coolDown());

    // assert
    expect(
      within(coolDown()).getByRole("spinbutton", {
        name: "Hamstring Stretch seconds",
      }),
    ).toHaveValue(30);
  });

  it("hands focus to Add stretch once the last stretch is removed", async () => {
    // arrange
    const { user } = renderWorkspace({
      block: newBlock({ coolDown: { enabled: true, items: ["couch"] } }),
    });

    // act
    await user.click(
      within(coolDown()).getByRole("button", { name: "Couch Stretch actions" }),
    );
    await user.click(await screen.findByRole("menuitem", { name: "Remove" }));

    // assert
    expect(
      within(coolDown()).getByRole("button", {
        name: "Add stretch to cool-down",
      }),
    ).toHaveFocus();
  });
});
