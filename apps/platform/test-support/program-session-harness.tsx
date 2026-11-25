import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type Ref } from "react";
import { DndProvider, useDrag } from "react-dnd";
import { TouchBackend } from "react-dnd-touch-backend";
import { vi } from "vitest";

import {
  CoolDownEditing,
  ProgramSuggestions,
  SessionEditing,
  WarmUpEditing,
  type Block,
  type Equipment,
  type LibraryExercise,
  type LibraryTarget,
  type Session,
  type Slot,
} from "~/bounded-contexts/programs/training-programs/public/program-editing";
import { ExerciseDetailProvider } from "~/bounded-contexts/programs/training-programs/ui/shared/program-view/exercise-detail";

import {
  BlockWorkspace,
  openSessionOf,
} from "~/bounded-contexts/programs/training-programs/ui/coach/program/block-workspace";
import { EditorAnnouncerProvider } from "~/bounded-contexts/programs/training-programs/ui/coach/program/editor-announcer";
import { LIBRARY_EXERCISE } from "~/bounded-contexts/programs/training-programs/ui/coach/program/session-dnd";

const LIBRARY_EQUIPMENT: Equipment[] = ["Barbell", "Dumbbells"];

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
    pattern: null,
    role: null,
    primaryMuscles: [],
    secondaryMuscles: [],
    equipment: [],
    tags: [],
    cues: "",
    videoPath: null,
    archived: false,
    ...overrides,
  };
}

const LIBRARY: LibraryExercise[] = [
  exercise("squat", "Back Squat", {
    pattern: "squat",
    role: "main-compound",
    primaryMuscles: ["Quadriceps"],
    equipment: ["Barbell"],
    cues: "Brace\nDrive through the floor",
  }),
  exercise("goblet", "Goblet Squat", {
    pattern: "squat",
    primaryMuscles: ["Quadriceps"],
    equipment: ["Dumbbells"],
  }),
  exercise("split-squat", "Split Squat", {
    pattern: "squat",
    primaryMuscles: ["Quadriceps"],
    equipment: ["Dumbbells"],
  }),
  exercise("rdl", "Romanian Deadlift", {
    pattern: "hinge",
    primaryMuscles: ["Hamstrings"],
    equipment: ["Barbell"],
  }),
  exercise("press", "Overhead Press", {
    pattern: "vertical-push",
    primaryMuscles: ["Shoulders"],
    equipment: ["Dumbbells"],
  }),
  exercise("rows", "Dumbbell Rows", {
    pattern: "horizontal-pull",
    primaryMuscles: ["Lats"],
    equipment: ["Dumbbells"],
  }),
  exercise("lateral", "Lateral Raises", {
    pattern: "isolation",
    primaryMuscles: ["Shoulders"],
    equipment: ["Dumbbells"],
  }),
  exercise("curl", "Biceps Curl", {
    pattern: "isolation",
    primaryMuscles: ["Biceps"],
    equipment: ["Dumbbells"],
  }),
  exercise("plank", "Plank", {
    pattern: "core",
    primaryMuscles: ["Core"],
    unit: "time",
  }),
  exercise("hips", "90/90 Hip Switches", { type: "mobility" }),
  exercise("lunges", "Walking Lunges", {
    type: "mobility",
    perSide: true,
    pattern: "lunge",
  }),
  exercise("jacks", "Jumping Jacks", { type: "mobility", unit: "time" }),
  exercise("skips", "Skipping", { type: "mobility", unit: "time" }),
  exercise("circles", "Arm Circles", { type: "mobility" }),
  exercise("cat", "Cat Cow", { type: "mobility" }),
  exercise("couch", "Couch Stretch", { type: "stretching", unit: "time" }),
  exercise("hamstring", "Hamstring Stretch", {
    type: "stretching",
    unit: "time",
  }),
];

const SETUP = {
  splitShape: "full-body",
  trainingDays: 3,
  sessionMinutes: 60,
  dailySteps: 6000,
  language: "en",
} as const;

let nextId = 0;

function newId(): string {
  nextId += 1;

  return `id-${nextId}`;
}

export function resetIds() {
  nextId = 0;
}

type RowSpec = readonly [exerciseId: string, slot: Slot];

type SessionSpec = {
  rows?: readonly RowSpec[];
  warmUp?: readonly string[];
  coolDown?: { enabled: boolean; items: readonly string[] };
};

function sessionEditing(block: Block): SessionEditing {
  return new SessionEditing({
    newId,
    blockType: block.type,
    libraryExercises: LIBRARY,
    libraryEquipment: LIBRARY_EQUIPMENT,
  });
}

function filled(block: Block, session: Session, spec: SessionSpec): Session {
  const editing = sessionEditing(block);
  const warmUps = new WarmUpEditing({ newId, libraryExercises: LIBRARY });
  const coolDowns = new CoolDownEditing({ newId });
  const withRows = (spec.rows ?? []).reduce(
    (current, [exerciseId, slot]) =>
      editing.add(
        current,
        LIBRARY.find((item) => item.id === exerciseId)!,
        {
          slot,
        },
      ),
    session,
  );
  const withWarmUp = (spec.warmUp ?? []).reduce(
    (current, exerciseId) => warmUps.add(current, exerciseId),
    withRows,
  );
  const withStretches = (spec.coolDown?.items ?? []).reduce(
    (current, exerciseId) => coolDowns.add(current, exerciseId),
    withWarmUp,
  );

  return coolDowns.withCoolDown(withStretches, {
    ...withStretches.coolDown,
    enabled: spec.coolDown?.enabled ?? false,
  });
}

export function newBlock(...specs: readonly SessionSpec[]): Block {
  const block = new ProgramSuggestions({
    libraryExercises: [],
    newId,
  }).newBlock("hypertrophy", 4, { setup: { ...SETUP, level: "beginner" } });

  return {
    ...block,
    sessions: block.sessions.map((session, index) =>
      filled(block, session, specs[index] ?? {}),
    ),
  };
}

export function withTargetMinutes(block: Block, targetMinutes: number): Block {
  return { ...block, targetMinutes };
}

export const FILLED_FIRST_SESSION: SessionSpec = {
  rows: [
    ["squat", "A"],
    ["rdl", "B"],
    ["lateral", "C"],
    ["plank", "D"],
  ],
  warmUp: ["hips"],
  coolDown: { enabled: true, items: ["couch"] },
};

const WIDE = 900;

let containerWidth = WIDE;

export function stubBrowserApis(width = WIDE) {
  containerWidth = width;
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.releasePointerCapture = () => {};
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
}

function pointAt(element: HTMLElement) {
  Object.assign(document, {
    elementFromPoint: () => element,
    elementsFromPoint: () => [element],
  });
}

export function stopPointingAt() {
  Reflect.deleteProperty(document, "elementFromPoint");
  Reflect.deleteProperty(document, "elementsFromPoint");
}

export function dragOnto(source: HTMLElement, target: HTMLElement) {
  pointAt(target);
  fireEvent.mouseDown(source, { button: 0, clientX: 10, clientY: 10 });
  fireEvent.mouseMove(document.body, { clientX: 40, clientY: 40 });
  fireEvent.mouseMove(document.body, { clientX: 60, clientY: 60 });
  fireEvent.mouseUp(document.body, { clientX: 60, clientY: 60 });
}

function LibrarySource({ exercise: dragged }: { exercise: LibraryExercise }) {
  const [, drag] = useDrag(
    () => ({ type: LIBRARY_EXERCISE, item: { exercise: dragged } }),
    [dragged],
  );

  return (
    <li
      ref={drag as unknown as Ref<HTMLLIElement>}
    >{`Drag ${dragged.name}`}</li>
  );
}

type WorkspaceProps = {
  block: Block;
  libraryTarget?: LibraryTarget | null;
  onBlockChange: (block: Block) => void;
  onOpenLibrary: (target: LibraryTarget) => void;
};

function Workspace({
  block: initial,
  libraryTarget = null,
  onBlockChange,
  onOpenLibrary,
}: WorkspaceProps) {
  const [block, setBlock] = useState(initial);
  const [chosen, setChosen] = useState<string>();

  return (
    <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true }}>
      <EditorAnnouncerProvider>
        <ExerciseDetailProvider>
          <BlockWorkspace
            block={block}
            blockIndex={0}
            blocks={[block]}
            language="en"
            level="beginner"
            libraryEquipment={LIBRARY_EQUIPMENT}
            libraryExercises={LIBRARY}
            libraryTarget={libraryTarget}
            onChange={(next) => {
              onBlockChange(next);
              setBlock(next);
            }}
            onOpenLibrary={onOpenLibrary}
            onOpenSession={setChosen}
            onRemove={() => {}}
            openSessionId={openSessionOf(block, chosen)}
          />
          <ul aria-label="Library">
            {LIBRARY.map((item) => (
              <LibrarySource exercise={item} key={item.id} />
            ))}
          </ul>
        </ExerciseDetailProvider>
      </EditorAnnouncerProvider>
    </DndProvider>
  );
}

type Arrangement = { block: Block; width?: number };

export function renderWorkspace({ block, width = WIDE }: Arrangement) {
  containerWidth = width;
  const changes: Block[] = [];
  const onOpenLibrary = vi.fn();
  render(
    <Workspace
      block={block}
      onBlockChange={(next) => changes.push(next)}
      onOpenLibrary={onOpenLibrary}
    />,
  );

  return { changes, onOpenLibrary, user: userEvent.setup() };
}

export function libraryItem(name: string): HTMLElement {
  return within(screen.getByRole("list", { name: "Library" })).getByText(
    `Drag ${name}`,
  );
}

export function session(name: string): HTMLElement {
  return screen.getByRole("article", { name });
}

export function slotGroup(sessionName: string, heading: string): HTMLElement {
  return within(session(sessionName))
    .getByRole("heading", { name: heading })
    .closest("section") as HTMLElement;
}

export function exerciseCard(sessionName: string, name: RegExp): HTMLElement {
  return within(session(sessionName)).getByRole("article", { name });
}

export function positions(sessionName: string): string[] {
  return within(session(sessionName))
    .getAllByRole("heading", { level: 5 })
    .map((heading) => (heading.textContent ?? "").split(" ")[0]);
}

export function gripOf(card: HTMLElement): HTMLElement {
  return card.querySelector("svg.lucide-grip-vertical")!
    .parentElement as HTMLElement;
}

export function emptyDropTarget(group: HTMLElement): HTMLElement {
  return within(group).getByText("Add or drop an exercise")
    .parentElement as HTMLElement;
}
