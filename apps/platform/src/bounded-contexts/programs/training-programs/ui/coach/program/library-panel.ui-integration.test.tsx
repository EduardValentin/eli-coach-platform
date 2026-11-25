// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  type Equipment,
  type LibraryExercise,
  type LibraryPickRefusal,
  type LibraryTarget,
} from "~/bounded-contexts/programs/training-programs/public/program-editing";

import { EditorAnnouncerProvider } from "./editor-announcer";
import { LibraryPanel } from "./library-panel";
import { DropZone, type DraggedItem } from "./session-dnd";
import { libraryPurpose, useLibraryPanel } from "./use-library-panel";

const SETUP = {
  splitShape: "full-body",
  trainingDays: 3,
  sessionMinutes: 60,
  dailySteps: 6000,
  language: "en",
} as const;

const HER_EQUIPMENT: Equipment[] = ["Barbell", "Dumbbells"];

function exercise(
  id: string,
  name: string,
  overrides: Partial<LibraryExercise> = {},
): LibraryExercise {
  return {
    id,
    name,
    type: "resistance",
    unit: "reps",
    perSide: false,
    pattern: "squat",
    role: "main-compound",
    primaryMuscles: ["Quadriceps"],
    secondaryMuscles: [],
    equipment: ["Barbell"],
    tags: [],
    cues: "",
    videoPath: null,
    archived: false,
    ...overrides,
  };
}

const SQUAT = exercise("squat", "Barbell Back Squat");
const LEG_PRESS = exercise("leg-press", "Leg Press", {
  equipment: ["Machine"],
});
const PUSH_UP = exercise("push-up", "Push-Up", {
  pattern: "horizontal-push",
  primaryMuscles: ["Chest"],
  equipment: [],
});
const LUNGES = exercise("lunges", "Walking Lunges", {
  pattern: "lunge",
  primaryMuscles: ["Glutes", "Quadriceps"],
  equipment: ["Dumbbells"],
});
const HIP_THRUST = exercise("hip-thrust", "Barbell Hip Thrust", {
  pattern: "hinge",
  primaryMuscles: ["Glutes"],
  archived: true,
});
const HIP_CIRCLES = exercise("hip-circles", "Hip Circles", {
  type: "mobility",
  pattern: null,
  primaryMuscles: ["Hip flexors"],
  equipment: [],
});
const BURPEES = exercise("burpees", "Burpees", {
  type: "cardio",
  pattern: "conditioning",
  primaryMuscles: ["Full body"],
  equipment: [],
  tags: ["Conditioning"],
});
const HAMSTRING_STRETCH = exercise("hamstring-stretch", "Hamstring Stretch", {
  type: "stretching",
  pattern: null,
  primaryMuscles: ["Hamstrings"],
  equipment: [],
});
const BIKE = exercise("bike", "Stationary Bike", {
  type: "cardio",
  pattern: null,
  primaryMuscles: ["Quadriceps"],
  equipment: ["Bike"],
});

const LIBRARY = [
  SQUAT,
  LEG_PRESS,
  PUSH_UP,
  LUNGES,
  HIP_THRUST,
  HIP_CIRCLES,
  BURPEES,
  HAMSTRING_STRETCH,
  BIKE,
];

let nextId = 0;

function newId(): string {
  nextId += 1;

  return `id-${nextId}`;
}

function blockWithSquatRow(): Block {
  const block = new ProgramSuggestions({
    libraryExercises: [],
    newId,
  }).newBlock("hypertrophy", 4, { setup: { ...SETUP, level: "beginner" } });
  const [first, ...others] = block.sessions;

  return {
    ...block,
    sessions: [
      {
        ...first,
        rows: [
          {
            id: "squat-row",
            exerciseId: SQUAT.id,
            slot: "A",
            startSets: [],
            restSeconds: 90,
            lastSetTechnique: "none",
            substitutions: [],
            progression: { kind: "double" },
            cues: "",
            touched: [],
          },
        ],
      },
      ...others,
    ],
  };
}

const BLOCK = blockWithSquatRow();
const SESSION = BLOCK.sessions[0];

type Viewport = "wide" | "narrow";

function stubViewport(viewport: Viewport) {
  vi.stubGlobal("matchMedia", (media: string) => ({
    matches: viewport === "wide" && media.includes("80em"),
    media,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

type HarnessProps = {
  library: readonly LibraryExercise[];
  added: LibraryExercise[];
  dropped: DraggedItem[];
  refusal?: LibraryPickRefusal;
};

function Harness({ library, added, dropped, refusal }: HarnessProps) {
  const panel = useLibraryPanel();
  const open = (target: LibraryTarget) => () => panel.openFor(target);

  return (
    <>
      <button onClick={panel.toggle} type="button">
        Toggle library
      </button>
      <button
        onClick={open({ kind: "warm-up", sessionId: SESSION.id })}
        type="button"
      >
        Add to warm-up
      </button>
      <button
        onClick={open({ kind: "cool-down", sessionId: SESSION.id })}
        type="button"
      >
        Add to cool-down
      </button>
      <button
        onClick={open({ kind: "slot", sessionId: SESSION.id, slot: "A" })}
        type="button"
      >
        Add to slot A
      </button>
      <button
        onClick={open({
          kind: "substitution",
          sessionId: SESSION.id,
          rowId: "squat-row",
        })}
        type="button"
      >
        Add a substitution
      </button>
      <DropZone
        rules={{ sessionId: SESSION.id, onDrop: (item) => dropped.push(item) }}
      >
        <p>Session drop zone</p>
      </DropZone>
      {panel.visible && (
        <LibraryPanel
          libraryEquipment={HER_EQUIPMENT}
          libraryExercises={library}
          onAdd={(picked) => {
            if (refusal) return refusal;
            added.push(picked);
            panel.finishTarget();

            return undefined;
          }}
          onClose={panel.close}
          presentation={panel.isWide ? "pane" : "drawer"}
          purpose={libraryPurpose(BLOCK, panel.panelTarget, library)}
          searchRef={panel.search}
        />
      )}
    </>
  );
}

type Arrangement = {
  library?: readonly LibraryExercise[];
  refusal?: LibraryPickRefusal;
};

async function renderPanel({ library = LIBRARY, refusal }: Arrangement = {}) {
  const added: LibraryExercise[] = [];
  const dropped: DraggedItem[] = [];
  const user = userEvent.setup();
  render(
    <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true }}>
      <EditorAnnouncerProvider>
        <Harness
          added={added}
          dropped={dropped}
          library={library}
          refusal={refusal}
        />
      </EditorAnnouncerProvider>
    </DndProvider>,
  );

  return { user, added, dropped };
}

function library(): HTMLElement {
  return screen.getByRole("complementary", { name: "Exercise library" });
}

function filtersPanel(): HTMLElement {
  return screen.getByRole("dialog", { name: "Filters" });
}

function addButton(name: string): HTMLElement {
  return within(library()).getByRole("button", { name: `Add ${name}` });
}

function queryAddButton(name: string): HTMLElement | null {
  return within(library()).queryByRole("button", { name: `Add ${name}` });
}

function searchBox(): HTMLElement {
  return within(library()).getByRole("searchbox", {
    name: "Search exercises",
  });
}

async function showAllEquipment(user: ReturnType<typeof userEvent.setup>) {
  await user.click(within(library()).getByRole("button", { name: /^Filters/ }));
  await user.click(
    within(filtersPanel()).getByRole("switch", { name: "Only her equipment" }),
  );
  await user.keyboard("{Escape}");
}

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {};
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.releasePointerCapture = () => {};
});

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      disconnect() {}
      observe() {}
      unobserve() {}
    },
  );
  stubViewport("wide");
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("the library panel", () => {
  it("opens on the resistance exercises of her equipment, leaving archived ones out", async () => {
    // arrange
    // act
    await renderPanel();

    // assert
    expect(
      within(library()).getByRole("heading", { name: "Exercise library" }),
    ).toBeInTheDocument();
    expect(addButton("Barbell Back Squat")).toBeInTheDocument();
    expect(addButton("Walking Lunges")).toBeInTheDocument();
    expect(addButton("Push-Up")).toBeInTheDocument();
    expect(queryAddButton("Leg Press")).not.toBeInTheDocument();
    expect(queryAddButton("Barbell Hip Thrust")).not.toBeInTheDocument();
    expect(queryAddButton("Hip Circles")).not.toBeInTheDocument();
    expect(
      within(library()).getByRole("button", { name: "Filters, 1 active" }),
    ).toBeInTheDocument();
  });

  it("shows no archived exercise either once all equipment is shown", async () => {
    // arrange
    const { user } = await renderPanel();

    // act
    await showAllEquipment(user);

    // assert
    expect(addButton("Leg Press")).toBeInTheDocument();
    expect(queryAddButton("Barbell Hip Thrust")).not.toBeInTheDocument();
  });

  it("describes each exercise by its muscles and equipment", async () => {
    // arrange
    // act
    await renderPanel();

    // assert
    expect(screen.getByText("Quadriceps · Barbell")).toBeInTheDocument();
    expect(screen.getByText("Glutes, Quadriceps · Dumbbells")).toBeVisible();
  });

  it("hands the exercise to the caller from its Add button", async () => {
    // arrange
    const { user, added } = await renderPanel();

    // act
    await user.click(addButton("Barbell Back Squat"));

    // assert
    expect(added).toEqual([SQUAT]);
  });

  it("lets the coach drag an exercise onto a session drop zone", async () => {
    // arrange
    const { dropped } = await renderPanel();
    const zone = screen.getByText("Session drop zone");
    const card = addButton("Barbell Back Squat").closest("li")?.firstChild;
    document.elementsFromPoint = () => [zone];
    document.elementFromPoint = () => zone;

    // act
    fireEvent.mouseDown(card as Element, { clientX: 5, clientY: 5 });
    fireEvent.mouseMove(zone, { clientX: 40, clientY: 40 });
    fireEvent.mouseMove(zone, { clientX: 60, clientY: 60 });
    fireEvent.mouseUp(zone, { clientX: 60, clientY: 60 });

    // assert
    expect(dropped).toEqual([
      { kind: "LIBRARY_EXERCISE", item: { exercise: SQUAT } },
    ]);
  });

  it("narrows the list by search, ignoring case", async () => {
    // arrange
    const { user } = await renderPanel();

    // act
    await user.type(searchBox(), "LUNGE");

    // assert
    expect(addButton("Walking Lunges")).toBeInTheDocument();
    expect(queryAddButton("Barbell Back Squat")).not.toBeInTheDocument();
  });

  it("shows the exercises of the type chosen in the type dropdown", async () => {
    // arrange
    const { user } = await renderPanel();
    await showAllEquipment(user);
    const type = within(library()).getByRole("combobox", {
      name: "Exercise type",
    });
    expect(type).toHaveTextContent("Resistance");

    // act
    await user.click(type);
    await user.click(await screen.findByRole("option", { name: "Cardio" }));

    // assert
    expect(type).toHaveTextContent("Cardio");
    expect(addButton("Stationary Bike")).toBeInTheDocument();
    expect(queryAddButton("Barbell Back Squat")).not.toBeInTheDocument();
  });

  it("opens the filters from the Filters button and closes them on Escape, returning focus to the button", async () => {
    // arrange
    const { user } = await renderPanel();
    const filtersButton = within(library()).getByRole("button", {
      name: "Filters, 1 active",
    });

    // act
    await user.click(filtersButton);

    // assert
    const panel = filtersPanel();
    expect(
      within(panel).getByRole("switch", { name: "Only her equipment" }),
    ).toBeChecked();
    expect(
      within(panel).getByRole("switch", { name: "Bodyweight" }),
    ).not.toBeChecked();
    expect(
      within(panel).getByRole("button", { name: "Pattern" }),
    ).toBeInTheDocument();
    expect(
      within(panel).getByRole("button", { name: "Muscle" }),
    ).toBeInTheDocument();

    // act
    await user.keyboard("{Escape}");

    // assert
    expect(
      screen.queryByRole("dialog", { name: "Filters" }),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(filtersButton).toHaveFocus());
  });

  it("counts the active filters on the Filters button and keeps focus in the panel as they change", async () => {
    // arrange
    const { user } = await renderPanel();
    await user.click(
      within(library()).getByRole("button", { name: "Filters, 1 active" }),
    );
    const bodyweight = within(filtersPanel()).getByRole("switch", {
      name: "Bodyweight",
    });

    // act
    await user.click(bodyweight);

    // assert
    expect(
      within(library()).getByRole("button", { name: "Filters, 2 active" }),
    ).toBeInTheDocument();
    expect(
      within(library()).queryByRole("list", { name: "Active filters" }),
    ).not.toBeInTheDocument();
    expect(queryAddButton("Barbell Back Squat")).not.toBeInTheDocument();
    expect(addButton("Push-Up")).toBeInTheDocument();

    // act
    await user.click(bodyweight);

    // assert
    expect(
      within(library()).getByRole("button", { name: "Filters, 1 active" }),
    ).toBeInTheDocument();
    expect(bodyweight).toHaveFocus();
    expect(filtersPanel()).toBeInTheDocument();
  });

  it("narrows by the muscle chosen in the filters", async () => {
    // arrange
    const { user } = await renderPanel();
    await user.click(
      within(library()).getByRole("button", { name: "Filters, 1 active" }),
    );

    // act
    await user.click(
      within(filtersPanel()).getByRole("button", { name: "Muscle" }),
    );
    await user.click(await screen.findByRole("checkbox", { name: "Chest" }));

    // assert
    expect(addButton("Push-Up")).toBeInTheDocument();
    expect(queryAddButton("Barbell Back Squat")).not.toBeInTheDocument();
    expect(
      within(library()).getByRole("button", { name: "Filters, 2 active" }),
    ).toBeInTheDocument();
  });

  it("clears the panel filters from the panel, closing it onto the Filters button and keeping the search", async () => {
    // arrange
    const { user } = await renderPanel();
    await user.type(searchBox(), "squat");
    await user.click(
      within(library()).getByRole("button", { name: "Filters, 1 active" }),
    );
    await user.click(
      within(filtersPanel()).getByRole("switch", { name: "Bodyweight" }),
    );

    // act
    await user.click(
      within(filtersPanel()).getByRole("button", { name: "Clear filters" }),
    );

    // assert
    expect(
      screen.queryByRole("dialog", { name: "Filters" }),
    ).not.toBeInTheDocument();
    const filtersButton = within(library()).getByRole("button", {
      name: "Filters",
    });
    await waitFor(() => expect(filtersButton).toHaveFocus());
    expect(searchBox()).toHaveValue("squat");
    await user.click(filtersButton);
    expect(
      within(filtersPanel()).getByRole("switch", {
        name: "Only her equipment",
      }),
    ).not.toBeChecked();
    expect(
      within(filtersPanel()).getByRole("switch", { name: "Bodyweight" }),
    ).not.toBeChecked();
  });
});

describe("a library with nothing to show", () => {
  it("lists each filter that leaves nothing as a chip that removes only that filter, moving focus to the next chip", async () => {
    // arrange
    const { user } = await renderPanel();
    await user.type(searchBox(), "zzz");
    const filters = () =>
      within(library()).getByRole("list", { name: "Active filters" });
    expect(within(library()).getByText("No matches")).toBeInTheDocument();
    expect(
      within(filters())
        .getAllByRole("listitem")
        .map((chip) => chip.textContent),
    ).toEqual(["Search: “zzz”", "Only her equipment"]);

    // act
    await user.click(
      within(filters()).getByRole("button", {
        name: "Remove filter Only her equipment",
      }),
    );

    // assert
    expect(
      within(library()).getByRole("button", { name: "Filters" }),
    ).toBeInTheDocument();
    expect(searchBox()).toHaveValue("zzz");
    expect(within(filters()).getAllByRole("listitem")).toHaveLength(1);
    expect(
      within(filters()).getByRole("button", {
        name: "Remove filter Search: “zzz”",
      }),
    ).toHaveFocus();
  });

  it("clears every filter that leaves nothing at once, returning focus to the search", async () => {
    // arrange
    const { user } = await renderPanel();
    await user.type(searchBox(), "zzz");

    // act
    await user.click(
      within(library()).getByRole("button", { name: "Clear filters" }),
    );

    // assert
    expect(searchBox()).toHaveValue("");
    expect(
      within(library()).getByRole("button", { name: "Filters" }),
    ).toBeInTheDocument();
    expect(addButton("Barbell Back Squat")).toBeInTheDocument();
    expect(searchBox()).toHaveFocus();
  });

  it("says no exercises of the kind exist yet, with no chips, when nothing matches and no filter is active", async () => {
    // arrange
    const { user } = await renderPanel({ library: [SQUAT] });
    await showAllEquipment(user);

    // act
    await user.click(
      within(library()).getByRole("combobox", { name: "Exercise type" }),
    );
    await user.click(await screen.findByRole("option", { name: "Stretching" }));

    // assert
    expect(
      within(library()).getByText("No stretching exercises yet."),
    ).toBeInTheDocument();
    expect(
      within(library()).queryByRole("list", { name: "Active filters" }),
    ).not.toBeInTheDocument();
    expect(
      within(library()).queryByRole("button", { name: "Clear filters" }),
    ).not.toBeInTheDocument();
  });

  it("announces how many exercises match once the search settles", async () => {
    // arrange
    const { user } = await renderPanel();

    // act
    await user.type(searchBox(), "lunge");

    // assert
    await waitFor(
      () => expect(screen.getByRole("status")).toHaveTextContent("1 exercise"),
      { timeout: 2000 },
    );

    // act
    await user.type(searchBox(), "zzz");

    // assert
    await waitFor(
      () =>
        expect(screen.getByRole("status")).toHaveTextContent(
          "No exercises match",
        ),
      { timeout: 2000 },
    );
  });
});

describe("a library opened for a place in a session", () => {
  it("opens on the warm-up's mobility exercises and the conditioning ones, announcing where it adds to without showing it", async () => {
    // arrange
    const { user } = await renderPanel();

    // act
    await user.click(screen.getByRole("button", { name: "Add to warm-up" }));

    // assert
    expect(addButton("Hip Circles")).toBeInTheDocument();
    expect(addButton("Burpees")).toBeInTheDocument();
    expect(queryAddButton("Barbell Back Squat")).not.toBeInTheDocument();
    expect(
      within(library()).getByRole("combobox", { name: "Exercise type" }),
    ).toHaveTextContent("Mobility");
    expect(searchBox()).toHaveAccessibleDescription(
      `Adding to ${SESSION.name} · Warm-up`,
    );
    expect(searchBox()).toHaveFocus();
  });

  it("announces the destination of an exercise once added", async () => {
    // arrange
    const { user, added } = await renderPanel();
    await user.click(screen.getByRole("button", { name: "Add to warm-up" }));

    // act
    await user.click(addButton("Hip Circles"));

    // assert
    expect(added).toEqual([HIP_CIRCLES]);
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        `Hip Circles added to ${SESSION.name} · Warm-up`,
      ),
    );
  });

  it.each<[LibraryPickRefusal, string]>([
    ["warm-up-full", "Hip Circles not added: the warm-up holds four exercises"],
    ["already-in-warm-up", "Hip Circles is already in the warm-up"],
    ["already-in-cool-down", "Hip Circles is already in the cool-down"],
    ["own-substitution", "Hip Circles can’t be its own substitution"],
    [
      "already-a-substitution",
      "Hip Circles is already one of its substitutions",
    ],
    [
      "substitutions-full",
      "Hip Circles not added: an exercise holds two substitutions",
    ],
  ])(
    "announces what the %s refusal means instead of that the exercise was added",
    async (refusal, copy) => {
      // arrange
      const { user, added } = await renderPanel({ refusal });
      await user.click(screen.getByRole("button", { name: "Add to warm-up" }));

      // act
      await user.click(addButton("Hip Circles"));

      // assert
      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent(copy),
      );
      expect(screen.getByRole("status")).not.toHaveTextContent("added to");
      expect(added).toEqual([]);
    },
  );

  it("opens on stretching for the cool-down", async () => {
    // arrange
    const { user } = await renderPanel();

    // act
    await user.click(screen.getByRole("button", { name: "Add to cool-down" }));

    // assert
    expect(addButton("Hamstring Stretch")).toBeInTheDocument();
    expect(queryAddButton("Hip Circles")).not.toBeInTheDocument();
    expect(searchBox()).toHaveAccessibleDescription(
      `Adding to ${SESSION.name} · Cool-down`,
    );
  });

  it("opens on resistance for a slot, naming the slot's planned role", async () => {
    // arrange
    const { user } = await renderPanel();

    // act
    await user.click(screen.getByRole("button", { name: "Add to slot A" }));

    // assert
    expect(addButton("Barbell Back Squat")).toBeInTheDocument();
    expect(searchBox()).toHaveAccessibleDescription(
      expect.stringMatching(new RegExp(`^Adding to ${SESSION.name} · A .+`)),
    );
  });

  it("opens on the movement pattern of the exercise a substitution is for", async () => {
    // arrange
    const { user } = await renderPanel();

    // act
    await user.click(
      screen.getByRole("button", { name: "Add a substitution" }),
    );

    // assert
    expect(searchBox()).toHaveAccessibleDescription(
      "Adding a substitution for Barbell Back Squat",
    );
    expect(addButton("Barbell Back Squat")).toBeInTheDocument();
    expect(queryAddButton("Walking Lunges")).not.toBeInTheDocument();
    expect(
      within(library()).getByRole("button", { name: "Filters, 2 active" }),
    ).toBeInTheDocument();
  });
});

describe("the library as a pane or a drawer", () => {
  it("stays beside the editor on a wide screen, collapsing from the toggle", async () => {
    // arrange
    const { user } = await renderPanel();
    expect(library()).toBeInTheDocument();

    // act
    await user.click(screen.getByRole("button", { name: "Toggle library" }));

    // assert
    expect(
      screen.queryByRole("complementary", { name: "Exercise library" }),
    ).not.toBeInTheDocument();
  });

  it("stays open after an add on a wide screen", async () => {
    // arrange
    const { user } = await renderPanel();
    await user.click(screen.getByRole("button", { name: "Add to warm-up" }));

    // act
    await user.click(addButton("Hip Circles"));

    // assert
    expect(library()).toBeInTheDocument();
  });

  it("opens as a drawer on a narrow screen and closes on Escape, returning focus to the opener", async () => {
    // arrange
    stubViewport("narrow");
    const user = userEvent.setup();
    render(
      <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true }}>
        <EditorAnnouncerProvider>
          <Harness added={[]} dropped={[]} library={LIBRARY} />
        </EditorAnnouncerProvider>
      </DndProvider>,
    );
    const opener = screen.getByRole("button", { name: "Add to warm-up" });
    expect(
      screen.queryByRole("complementary", { name: "Exercise library" }),
    ).not.toBeInTheDocument();

    // act
    await user.click(opener);

    // assert
    const drawer = screen.getByRole("dialog", { name: "Exercise library" });
    expect(
      within(drawer).getByRole("searchbox", { name: "Search exercises" }),
    ).toHaveFocus();

    // act
    await user.keyboard("{Escape}");

    // assert
    expect(
      screen.queryByRole("dialog", { name: "Exercise library" }),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it("closes the drawer from its own close button", async () => {
    // arrange
    stubViewport("narrow");
    const user = userEvent.setup();
    render(
      <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true }}>
        <EditorAnnouncerProvider>
          <Harness added={[]} dropped={[]} library={LIBRARY} />
        </EditorAnnouncerProvider>
      </DndProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Add to warm-up" }));

    // act
    await user.click(
      within(
        screen.getByRole("dialog", { name: "Exercise library" }),
      ).getByRole("button", { name: "Close" }),
    );

    // assert
    expect(
      screen.queryByRole("dialog", { name: "Exercise library" }),
    ).not.toBeInTheDocument();
  });

  it("closes the drawer once an exercise is added", async () => {
    // arrange
    stubViewport("narrow");
    const user = userEvent.setup();
    const added: LibraryExercise[] = [];
    render(
      <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true }}>
        <EditorAnnouncerProvider>
          <Harness added={added} dropped={[]} library={LIBRARY} />
        </EditorAnnouncerProvider>
      </DndProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Add to warm-up" }));

    // act
    await user.click(
      within(
        screen.getByRole("dialog", { name: "Exercise library" }),
      ).getByRole("button", { name: "Add Hip Circles" }),
    );

    // assert
    expect(added).toEqual([HIP_CIRCLES]);
    expect(
      screen.queryByRole("dialog", { name: "Exercise library" }),
    ).not.toBeInTheDocument();
  });
});
