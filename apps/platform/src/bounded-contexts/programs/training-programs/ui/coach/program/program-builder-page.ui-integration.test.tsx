// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
  type RenderOptions,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { createMemoryRouter, RouterProvider } from "react-router";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { coachClientPath } from "~/bounded-contexts/clients/public/paths";
import { exerciseEditorPath } from "~/bounded-contexts/programs/exercise-library/public/paths";
import {
  PROGRAM_BUILDER_ROUTE_SEGMENT,
  programBuilderPath,
  programDraftSavePath,
  programSetupPath,
} from "~/bounded-contexts/programs/training-programs/public/paths";
import type { ProgramDraftView } from "~/bounded-contexts/programs/training-programs/public/program-draft";
import {
  BlockEditing,
  ProgramSuggestions,
  type Block,
  type BlockSetup,
  type LibraryExercise,
} from "~/bounded-contexts/programs/training-programs/public/program-editing";

import ProgramBuilderRoute from "./program-builder-page";

const CLIENT_ID = "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11";
const SAVE_DELAY_MS = 800;
const RETRY_INTERVAL_MS = 15_000;
const OPENED_AT = "2026-11-23T09:00:00.000Z";
const FIRST_SAVE_AT = "2026-11-23T09:01:00.000Z";
const SAVED_ELSEWHERE_AT = "2026-11-23T09:05:00.000Z";

const CLIENT = {
  clientId: CLIENT_ID,
  firstName: "Jane",
  lastName: "Doe",
  gender: "female",
} as const;

const BLOCK_SETUP: BlockSetup = {
  splitShape: "full-body",
  trainingDays: 3,
  sessionMinutes: 60,
  dailySteps: 6000,
  language: "en",
};

function beginnerPlan() {
  let next = 0;

  return new ProgramSuggestions({
    libraryExercises: [],
    newId: () => `id-${(next += 1)}`,
  }).initialContent({ ...BLOCK_SETUP, level: "beginner" });
}

function draftView(
  overrides: Partial<Extract<ProgramDraftView, { state: "draft" }>> = {},
): ProgramDraftView {
  return {
    state: "draft",
    client: CLIENT,
    coachingEnded: false,
    level: "beginner",
    language: "en",
    versionNumber: 1,
    content: beginnerPlan(),
    updatedAt: OPENED_AT,
    startingBlockSetup: BLOCK_SETUP,
    libraryExercises: [],
    clientProfile: null,
    libraryEquipment: [],
    ...overrides,
  };
}

const BARBELL_SQUAT: LibraryExercise = {
  id: "barbell-squat",
  name: "Barbell Back Squat",
  type: "resistance",
  unit: "reps",
  perSide: false,
  pattern: "squat",
  role: "main-compound",
  primaryMuscles: ["Quadriceps"],
  secondaryMuscles: ["Glutes"],
  equipment: ["Barbell"],
  tags: [],
  cues: "Brace\nDrive through the floor",
  videoPath: null,
  archived: false,
};

const HIP_CIRCLES: LibraryExercise = {
  ...BARBELL_SQUAT,
  id: "hip-circles",
  name: "Hip Circles",
  type: "mobility",
  pattern: null,
  primaryMuscles: ["Hip flexors"],
  secondaryMuscles: [],
  equipment: [],
};

type SaveRequestBody = {
  level: string;
  language: string;
  updatedAt: string;
  content: { plan: { blocks: Block[] } };
};

const server = setupServer();
let router: ReturnType<typeof createMemoryRouter>;
const saveRequests: SaveRequestBody[] = [];
let storedView: ProgramDraftView = draftView();

function answerSaves(answer: () => Response) {
  server.use(
    http.put(`*${programDraftSavePath(CLIENT_ID)}`, async ({ request }) => {
      saveRequests.push((await request.json()) as SaveRequestBody);

      return answer();
    }),
  );
}

function savedAt(updatedAt: string) {
  return () => HttpResponse.json({ status: "saved", updatedAt });
}

function failing() {
  return new HttpResponse(null, { status: 500 });
}

type Screen = "desktop" | "phone";

function stubScreen(shown: Screen) {
  vi.stubGlobal("matchMedia", (media: string) => ({
    matches: shown === "desktop" && media.includes("min-width"),
    media,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
  Element.prototype.scrollIntoView = () => {};
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.releasePointerCapture = () => {};
  stubScreen("desktop");
  vi.stubGlobal(
    "ResizeObserver",
    class {
      disconnect() {}
      observe() {}
      unobserve() {}
    },
  );
});

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  saveRequests.length = 0;
  storedView = draftView();
});

afterEach(() => {
  cleanup();
  stubScreen("desktop");
  server.resetHandlers();
  vi.useRealTimers();
});

afterAll(() => {
  server.close();
  vi.unstubAllGlobals();
});

describe("the program builder", () => {
  it("opens her draft on the plan overview under one heading, with the way back to her", async () => {
    // arrange, act
    await renderBuilder();

    // assert
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 1, name: "Overview" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Jane Doe · v1 draft")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to Jane Doe" }),
    ).toHaveAttribute("href", coachClientPath(CLIENT_ID));
    expect(
      screen.getByRole("main", { name: "Program editor" }),
    ).toBeInTheDocument();
  });

  it("says her coaching has ended on the draft line and still lets the coach edit", async () => {
    // arrange
    storedView = draftView({ coachingEnded: true });

    // act
    await renderBuilder();

    // assert
    expect(
      screen.getByText("Jane Doe · v1 draft · coaching ended"),
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Level" })).toBeEnabled();
  });

  it("offers the setup when she has no program yet", async () => {
    // arrange
    storedView = { state: "no-program", client: CLIENT };

    // act
    await renderBuilder();

    // assert
    expect(
      screen.getByRole("heading", { name: "No program yet" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "There is no draft to edit yet. Set up the program to start its first version.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Set up program" }),
    ).toHaveAttribute("href", programSetupPath(CLIENT_ID));
  });

  it("opens a block from the section list, naming the place in the breadcrumb", async () => {
    // arrange
    const user = await renderBuilder();

    // act
    await user.click(
      within(sectionList()).getByRole("button", { name: /^2\s?Hypertrophy/ }),
    );

    // assert
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Block 2 · Hypertrophy",
      }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("navigation", { name: "Breadcrumb" })).getByRole(
        "button",
        { name: "Overview" },
      ),
    ).toBeInTheDocument();
  });

  it("adds the proposed block at the end of the plan and opens it", async () => {
    // arrange
    answerSaves(savedAt(FIRST_SAVE_AT));
    const user = await renderBuilder();

    // act
    await user.click(
      within(sectionList()).getByRole("button", { name: "Add block" }),
    );
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Add block",
      }),
    );

    // assert
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Block 4 · Hypertrophy",
      }),
    ).toBeInTheDocument();
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Hypertrophy block added as block 4",
    );
  });
});

describe("focus and title as the plan changes", () => {
  it("moves focus to the place heading once the last block is removed and again after using the suggestion", async () => {
    // arrange
    answerSaves(savedAt(FIRST_SAVE_AT));
    const user = await renderBuilder();
    for (const type of ["Foundation", "Hypertrophy"]) {
      await removeFirstBlock(user, type);
    }

    // act
    await removeFirstBlock(user, "Deload");

    // assert
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { level: 1, name: "Overview" }),
      ).toHaveFocus(),
    );

    // act
    await user.click(screen.getByRole("button", { name: "Use suggestion" }));

    // assert
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { level: 1, name: "Overview" }),
      ).toHaveFocus(),
    );
  });

  it("moves focus to the place heading once the open block is removed from its own menu", async () => {
    // arrange
    answerSaves(savedAt(FIRST_SAVE_AT));
    const user = await renderBuilder();
    await user.click(
      within(sectionList()).getByRole("button", { name: /^3\s?Deload/ }),
    );

    // act
    screen.getByRole("button", { name: "Block actions" }).focus();
    await user.keyboard("{Enter}");
    await screen.findByRole("menuitem", { name: "Remove block" });
    await user.keyboard("{End}{Enter}");
    const confirm = await screen.findByRole("button", { name: "Remove block" });
    confirm.focus();
    await user.keyboard("{Enter}");

    // assert
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { level: 1, name: "Overview" }),
      ).toHaveFocus(),
    );
  });

  it("titles the page after the place, also for a block added in this visit", async () => {
    // arrange
    answerSaves(savedAt(FIRST_SAVE_AT));
    const user = await renderBuilder();

    // act
    await user.click(
      within(sectionList()).getByRole("button", { name: "Add block" }),
    );
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Add block",
      }),
    );

    // assert
    await waitFor(() =>
      expect(document.title).toBe("Block 4 · Hypertrophy · Jane Doe | Evoa"),
    );
  });
});

describe("saving the draft as she works", () => {
  it("says it is saving from the first change and saved once the whole draft is sent with the copy's marker", async () => {
    // arrange
    answerSaves(savedAt(FIRST_SAVE_AT));
    const user = await renderBuilder();

    // act
    await chooseLevel(user, "Intermediate");

    // assert
    expect(draftLine()).toHaveTextContent("Jane Doe · v1 draft · Saving…");
    await advance(SAVE_DELAY_MS);
    await waitFor(() =>
      expect(draftLine()).toHaveTextContent("Jane Doe · v1 draft · Saved"),
    );
    expect(saveRequests).toEqual([
      expect.objectContaining({
        level: "intermediate",
        language: "en",
        updatedAt: OPENED_AT,
      }),
    ]);
  });

  it("says saved once the change is sent when strict mode replays the builder's effects, as in development", async () => {
    // arrange
    answerSaves(savedAt(FIRST_SAVE_AT));
    const user = await renderBuilder({ reactStrictMode: true });

    // act
    await chooseLevel(user, "Intermediate");
    await advance(SAVE_DELAY_MS);

    // assert
    await waitFor(() =>
      expect(draftLine()).toHaveTextContent("Jane Doe · v1 draft · Saved"),
    );
  });

  it("sends the next save with the marker the last save answered", async () => {
    // arrange
    answerSaves(savedAt(FIRST_SAVE_AT));
    const user = await renderBuilder();
    await chooseLevel(user, "Intermediate");
    await advance(SAVE_DELAY_MS);
    await waitFor(() => expect(draftLine()).toHaveTextContent("Saved"));

    // act
    await chooseLanguage(user, "Romanian");
    await advance(SAVE_DELAY_MS);

    // assert
    await waitFor(() => expect(saveRequests).toHaveLength(2));
    expect(saveRequests[1]).toMatchObject({
      language: "ro",
      updatedAt: FIRST_SAVE_AT,
    });
  });

  it("keeps a change that failed to save on screen, says so once, and tries again by itself", async () => {
    // arrange
    answerSaves(failing);
    const user = await renderBuilder();

    // act
    await chooseLevel(user, "Advanced");
    await advance(SAVE_DELAY_MS);

    // assert
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "Your latest changes aren’t saved yet. They’re still here, and saving keeps trying.",
    );
    expect(draftLine()).toHaveTextContent("· Not saved");
    expect(screen.getByRole("combobox", { name: "Level" })).toHaveTextContent(
      "Advanced",
    );

    answerSaves(savedAt(FIRST_SAVE_AT));
    await advance(RETRY_INTERVAL_MS);
    await waitFor(() =>
      expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
    );
    expect(draftLine()).toHaveTextContent("· Saved");
    expect(screen.getByRole("status")).toHaveTextContent("All changes saved.");
  });

  it("tries again at once on Try again now, and says when it is still not saved", async () => {
    // arrange
    answerSaves(failing);
    const user = await renderBuilder();
    await chooseLevel(user, "Advanced");
    await advance(SAVE_DELAY_MS);
    await screen.findByRole("alert");
    const sentBefore = saveRequests.length;

    // act
    await user.click(screen.getByRole("button", { name: "Try again now" }));

    // assert
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Still not saved."),
    );
    expect(saveRequests).toHaveLength(sentBefore + 1);
    expect(
      screen.getByRole("button", { name: "Try again now" }),
    ).toBeInTheDocument();
  });

  it("recovers on Try again now, removing the failure and moving focus to the place heading", async () => {
    // arrange
    answerSaves(failing);
    const user = await renderBuilder();
    await chooseLevel(user, "Advanced");
    await advance(SAVE_DELAY_MS);
    await screen.findByRole("alert");
    answerSaves(savedAt(FIRST_SAVE_AT));

    // act
    await user.click(screen.getByRole("button", { name: "Try again now" }));

    // assert
    await waitFor(() =>
      expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent("All changes saved.");
  });

  it("treats a save sent back to sign in as not saved", async () => {
    // arrange
    answerSaves(
      () =>
        new HttpResponse(null, {
          status: 302,
          headers: { Location: "/sign-in" },
        }),
    );
    const user = await renderBuilder();

    // act
    await chooseLevel(user, "Advanced");
    await advance(SAVE_DELAY_MS);

    // assert
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(draftLine()).toHaveTextContent("· Not saved");
  });
});

describe("a draft that changed elsewhere", () => {
  it("locks the builder behind a dialog whose only way on is Reload, which shows the newer draft", async () => {
    // arrange
    answerSaves(() =>
      HttpResponse.json({ error: "changed-elsewhere" }, { status: 409 }),
    );
    const user = await renderBuilder();
    await chooseLevel(user, "Advanced");

    // act
    await advance(SAVE_DELAY_MS);

    // assert
    const dialog = await screen.findByRole("alertdialog", {
      name: "This draft changed elsewhere",
    });
    expect(dialog).toHaveAccessibleDescription(
      "It was saved from another tab or device after you opened it here, so what you changed just now wasn’t saved. Reload to see the newer draft.",
    );
    expect(within(dialog).getAllByRole("button")).toHaveLength(1);
    expect(
      within(dialog).getByRole("button", { name: "Reload" }),
    ).toHaveFocus();
    expect(draftLine()).toHaveTextContent("· Changed elsewhere");

    await user.keyboard("{Escape}");
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    storedView = draftView({
      level: "intermediate",
      updatedAt: SAVED_ELSEWHERE_AT,
    });
    await user.click(within(dialog).getByRole("button", { name: "Reload" }));
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("combobox", { name: "Level" })).toHaveTextContent(
      "Intermediate",
    );
    expect(draftLine()).toHaveTextContent(/^Jane Doe · v1 draft$/);
    expect(screen.getByRole("heading", { level: 1 })).toHaveFocus();
  });

  it("saves the next change over the newer draft's marker once reloaded", async () => {
    // arrange
    answerSaves(() =>
      HttpResponse.json({ error: "changed-elsewhere" }, { status: 409 }),
    );
    const user = await renderBuilder();
    await chooseLevel(user, "Advanced");
    await advance(SAVE_DELAY_MS);
    storedView = draftView({ updatedAt: SAVED_ELSEWHERE_AT });
    await user.click(await screen.findByRole("button", { name: "Reload" }));
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    answerSaves(savedAt(FIRST_SAVE_AT));

    // act
    await chooseLevel(user, "Intermediate");
    await advance(SAVE_DELAY_MS);

    // assert
    await waitFor(() => expect(draftLine()).toHaveTextContent("· Saved"));
    expect(saveRequests.at(-1)).toMatchObject({
      level: "intermediate",
      updatedAt: SAVED_ELSEWHERE_AT,
    });
  });
});

describe("leaving with unsaved changes", () => {
  it("waits for a save in flight and then leaves without asking", async () => {
    // arrange
    answerSaves(savedAt(FIRST_SAVE_AT));
    const user = await renderBuilder();
    await chooseLevel(user, "Advanced");

    // act
    await user.click(screen.getByRole("link", { name: "Back to Jane Doe" }));

    // assert
    expect(
      await screen.findByRole("heading", { name: "Client page" }),
    ).toBeInTheDocument();
    expect(saveRequests).toEqual([
      expect.objectContaining({ level: "advanced" }),
    ]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("asks before leaving once a save failed, and Keep editing returns to the link she used", async () => {
    // arrange
    answerSaves(failing);
    const user = await renderBuilder();
    await chooseLevel(user, "Advanced");
    await advance(SAVE_DELAY_MS);
    await screen.findByRole("alert");
    const back = screen.getByRole("link", { name: "Back to Jane Doe" });

    // act
    await user.click(back);

    // assert
    const dialog = await screen.findByRole("dialog", {
      name: "Unsaved changes",
    });
    expect(dialog).toHaveAccessibleDescription(
      "Your latest changes aren’t saved yet. If you leave now, they’re lost.",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Keep editing" }),
    );
    await waitFor(() => expect(back).toHaveFocus());
    expect(
      screen.queryByRole("heading", { name: "Client page" }),
    ).not.toBeInTheDocument();
  });

  it("leaves without another save attempt on Leave without saving", async () => {
    // arrange
    answerSaves(failing);
    const user = await renderBuilder();
    await chooseLevel(user, "Advanced");
    await advance(SAVE_DELAY_MS);
    await screen.findByRole("alert");
    await user.click(screen.getByRole("link", { name: "Back to Jane Doe" }));
    const sentBefore = saveRequests.length;

    // act
    await user.click(
      await screen.findByRole("button", { name: "Leave without saving" }),
    );

    // assert
    expect(
      await screen.findByRole("heading", { name: "Client page" }),
    ).toBeInTheDocument();
    expect(saveRequests).toHaveLength(sentBefore);
  });

  it("still sends a change queued for saving when she leaves by the browser history", async () => {
    // arrange
    answerSaves(savedAt(FIRST_SAVE_AT));
    const user = await renderBuilder();
    await chooseLevel(user, "Advanced");

    // act
    await act(() => router.navigate(`/coach/clients/${CLIENT_ID}`));

    // assert
    expect(
      await screen.findByRole("heading", { name: "Client page" }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(saveRequests).toEqual([
        expect.objectContaining({ level: "advanced" }),
      ]),
    );
  });

  it("warns on closing the tab only while a change is unsent", async () => {
    // arrange
    answerSaves(savedAt(FIRST_SAVE_AT));
    const user = await renderBuilder();
    const untouched = unloadIsHeld();

    // act
    await chooseLevel(user, "Advanced");
    const whileSaving = unloadIsHeld();
    await advance(SAVE_DELAY_MS);
    await waitFor(() => expect(draftLine()).toHaveTextContent("· Saved"));
    const onceSaved = unloadIsHeld();

    // assert
    expect([untouched, whileSaving, onceSaved]).toEqual([false, true, false]);
  });
});

describe("the exercise library beside an open block", () => {
  it("shows beside an open block and collapses and returns from the top bar", async () => {
    // arrange
    storedView = draftView({
      libraryExercises: [BARBELL_SQUAT],
      libraryEquipment: ["Barbell"],
    });
    const user = await renderBuilder();
    expect(
      screen.queryByRole("button", { name: "Exercise library" }),
    ).not.toBeInTheDocument();

    // act
    await openHypertrophyBlock(user);

    // assert
    const toggle = screen.getByRole("button", { name: "Exercise library" });
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("complementary", { name: "Exercise library" }),
    ).toBeInTheDocument();

    // act
    await user.click(toggle);

    // assert
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(
      screen.queryByRole("complementary", { name: "Exercise library" }),
    ).not.toBeInTheDocument();

    // act
    await user.click(toggle);

    // assert
    expect(
      screen.getByRole("complementary", { name: "Exercise library" }),
    ).toBeInTheDocument();
  });

  it("opens from the draft actions menu as a drawer on a phone", async () => {
    // arrange
    stubScreen("phone");
    storedView = draftView({
      libraryExercises: [BARBELL_SQUAT],
      libraryEquipment: ["Barbell"],
    });
    const user = await renderBuilder();
    await openHypertrophyBlock(user);
    expect(
      screen.queryByRole("dialog", { name: "Exercise library" }),
    ).not.toBeInTheDocument();

    // act
    await user.click(screen.getByRole("button", { name: "Draft actions" }));
    await user.click(
      await screen.findByRole("menuitem", { name: "Exercise library" }),
    );

    // assert
    expect(
      await screen.findByRole("dialog", { name: "Exercise library" }),
    ).toBeInTheDocument();
  });

  it("adds an exercise to the open session from the phone drawer, saving it with the autosave", async () => {
    // arrange
    stubScreen("phone");
    answerSaves(savedAt(FIRST_SAVE_AT));
    storedView = draftView({
      libraryExercises: [BARBELL_SQUAT],
      libraryEquipment: ["Barbell"],
    });
    const user = await renderBuilder();
    await openHypertrophyBlock(user);
    await user.click(screen.getByRole("button", { name: "Draft actions" }));
    await user.click(
      await screen.findByRole("menuitem", { name: "Exercise library" }),
    );
    const drawer = await screen.findByRole("dialog", {
      name: "Exercise library",
    });

    // act
    await user.click(
      within(drawer).getByRole("button", { name: "Add Barbell Back Squat" }),
    );
    await advance(SAVE_DELAY_MS);

    // assert
    await waitFor(() => expect(saveRequests).toHaveLength(1));
    const [hypertrophy] = savedBlocks(saveRequests[0]).filter(
      (block) => block.type === "hypertrophy",
    );
    expect(sessionsHolding(hypertrophy, BARBELL_SQUAT.id)).toEqual([
      BlockEditing.listedSessions(hypertrophy)[0].id,
    ]);
  });

  it("adds an exercise to the open session of a wide screen's pane, leaving the pane open", async () => {
    // arrange
    answerSaves(savedAt(FIRST_SAVE_AT));
    storedView = draftView({
      libraryExercises: [BARBELL_SQUAT],
      libraryEquipment: ["Barbell"],
    });
    const user = await renderBuilder();
    await openHypertrophyBlock(user);
    const pane = screen.getByRole("complementary", {
      name: "Exercise library",
    });

    // act
    await user.click(
      within(pane).getByRole("button", { name: "Add Barbell Back Squat" }),
    );
    await advance(SAVE_DELAY_MS);

    // assert
    await waitFor(() => expect(saveRequests).toHaveLength(1));
    const [hypertrophy] = savedBlocks(saveRequests[0]).filter(
      (block) => block.type === "hypertrophy",
    );
    expect(sessionsHolding(hypertrophy, BARBELL_SQUAT.id)).toEqual([
      BlockEditing.listedSessions(hypertrophy)[0].id,
    ]);
    expect(
      screen.getByRole("complementary", { name: "Exercise library" }),
    ).toBeInTheDocument();
  });
});

describe("the exercise library opened from a place in the open session", () => {
  it("adds to that place, announcing where, and leaves the pane open on a wide screen", async () => {
    // arrange
    answerSaves(savedAt(FIRST_SAVE_AT));
    storedView = draftView({
      libraryExercises: [BARBELL_SQUAT, HIP_CIRCLES],
      libraryEquipment: ["Barbell"],
    });
    const user = await renderBuilder();
    await openHypertrophyBlock(user);

    // act
    await user.click(
      screen.getByRole("button", { name: "Add exercise to warm-up" }),
    );
    const pane = screen.getByRole("complementary", {
      name: "Exercise library",
    });
    await user.click(
      within(pane).getByRole("button", { name: "Add Hip Circles" }),
    );
    const announced = (await screen.findByText(/^Hip Circles added to/))
      .textContent;
    await advance(SAVE_DELAY_MS);

    // assert
    await waitFor(() => expect(saveRequests).toHaveLength(1));
    const [hypertrophy] = savedBlocks(saveRequests[0]).filter(
      (block) => block.type === "hypertrophy",
    );
    const [openSession] = BlockEditing.listedSessions(hypertrophy);
    expect(openSession.warmUp.items.map((item) => item.exerciseId)).toEqual([
      HIP_CIRCLES.id,
    ]);
    expect(announced).toBe(
      `Hip Circles added to ${openSession.name} · Warm-up`,
    );
    expect(pane).toBeInTheDocument();
  });

  it("closes the drawer once the exercise is added on a phone", async () => {
    // arrange
    stubScreen("phone");
    answerSaves(savedAt(FIRST_SAVE_AT));
    storedView = draftView({
      libraryExercises: [BARBELL_SQUAT, HIP_CIRCLES],
      libraryEquipment: ["Barbell"],
    });
    const user = await renderBuilder();
    await openHypertrophyBlock(user);
    await user.click(
      screen.getByRole("button", { name: "Add exercise to warm-up" }),
    );
    const drawer = await screen.findByRole("dialog", {
      name: "Exercise library",
    });

    // act
    await user.click(
      within(drawer).getByRole("button", { name: "Add Hip Circles" }),
    );

    // assert
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Exercise library" }),
      ).not.toBeInTheDocument(),
    );
  });
});

describe("an exercise's detail in the builder", () => {
  it("links to the exercise in the library, which asks before leaving while a save has failed", async () => {
    // arrange
    answerSaves(failing);
    storedView = draftView({
      libraryExercises: [BARBELL_SQUAT],
      libraryEquipment: ["Barbell"],
    });
    const user = await renderBuilder();
    await chooseLevel(user, "Advanced");
    await advance(SAVE_DELAY_MS);
    await screen.findByRole("alert");
    await openHypertrophyBlock(user);
    await user.click(
      within(
        screen.getByRole("complementary", { name: "Exercise library" }),
      ).getByRole("button", { name: "Barbell Back Squat" }),
    );
    const link = within(
      await screen.findByRole("dialog", { name: "Barbell Back Squat" }),
    ).getByRole("link", { name: "Edit in exercise library" });
    expect(link).toHaveAttribute("href", exerciseEditorPath(BARBELL_SQUAT.id));

    // act
    await user.click(link);

    // assert
    expect(
      await screen.findByRole("dialog", { name: "Unsaved changes" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Exercise page" }),
    ).not.toBeInTheDocument();
  });

  it("leaves for the exercise in the library once everything is saved", async () => {
    // arrange
    storedView = draftView({
      libraryExercises: [BARBELL_SQUAT],
      libraryEquipment: ["Barbell"],
    });
    const user = await renderBuilder();
    await openHypertrophyBlock(user);
    await user.click(
      within(
        screen.getByRole("complementary", { name: "Exercise library" }),
      ).getByRole("button", { name: "Barbell Back Squat" }),
    );

    // act
    await user.click(
      await screen.findByRole("link", { name: "Edit in exercise library" }),
    );

    // assert
    expect(
      await screen.findByRole("heading", { name: "Exercise page" }),
    ).toBeInTheDocument();
  });
});

function savedBlocks(request: SaveRequestBody): Block[] {
  return request.content.plan.blocks;
}

function sessionsHolding(block: Block, exerciseId: string): string[] {
  return block.sessions
    .filter((session) =>
      session.rows.some((row) => row.exerciseId === exerciseId),
    )
    .map((session) => session.id);
}

async function openHypertrophyBlock(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    within(sectionList()).getByRole("button", { name: /^2\s?Hypertrophy/ }),
  );
  await screen.findByRole("heading", {
    level: 1,
    name: "Block 2 · Hypertrophy",
  });
}

function unloadIsHeld(): boolean {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);

  return event.defaultPrevented;
}

async function removeFirstBlock(
  user: ReturnType<typeof userEvent.setup>,
  type: string,
) {
  await user.click(
    screen.getByRole("button", { name: `Remove block 1, ${type}` }),
  );
  const confirm = screen.queryByRole("button", { name: "Remove block" });
  if (confirm) await user.click(confirm);
}

function sectionList(): HTMLElement {
  return screen.getByRole("navigation", { name: "Program sections" });
}

function draftLine(): HTMLElement {
  return screen.getByText(/^Jane Doe · v1 draft/);
}

async function advance(milliseconds: number) {
  await act(() => vi.advanceTimersByTimeAsync(milliseconds));
}

async function chooseOption(
  user: ReturnType<typeof userEvent.setup>,
  field: string,
  option: string,
) {
  await user.click(screen.getByRole("combobox", { name: field }));
  await user.click(await screen.findByRole("option", { name: option }));
}

function chooseLevel(user: ReturnType<typeof userEvent.setup>, level: string) {
  return chooseOption(user, "Level", level);
}

function chooseLanguage(
  user: ReturnType<typeof userEvent.setup>,
  language: string,
) {
  return chooseOption(user, "Language", language);
}

async function renderBuilder(options?: RenderOptions) {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  router = createMemoryRouter(
    [
      {
        Component: ProgramBuilderRoute,
        loader: () => storedView,
        path: `/coach/${PROGRAM_BUILDER_ROUTE_SEGMENT}`,
      },
      {
        Component: () => <h1>Client page</h1>,
        path: "/coach/clients/:clientId",
      },
      {
        Component: () => <h1>Exercise page</h1>,
        path: "/coach/training/exercises/:exerciseId",
      },
    ],
    { initialEntries: [programBuilderPath(CLIENT_ID)] },
  );

  render(<RouterProvider router={router} />, options);
  await screen.findAllByRole("heading", { level: 1 });

  return user;
}
