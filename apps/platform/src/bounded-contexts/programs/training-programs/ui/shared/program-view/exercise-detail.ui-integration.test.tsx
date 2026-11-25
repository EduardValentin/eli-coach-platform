// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import type {
  LibraryExercise,
  WeekRow,
} from "~/bounded-contexts/programs/training-programs/public/program-editing";

import { ExerciseDetailProvider } from "./exercise-detail";
import {
  exerciseDetailOf,
  type ExerciseDetailContent,
} from "./exercise-detail-content";
import { ExerciseNameButton } from "./exercise-name-button";
import { SupersetGroup } from "./superset-group";
import { EditableRoutine } from "./routine-list";
import { SwapRows } from "./swap-list";
import { rowTargets } from "./targets";
import {
  DisclosureContent,
  DisclosureTrigger,
  TextDisclosureGroup,
} from "./text-disclosure";

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      addEventListener: () => {},
      matches: false,
      media: query,
      removeEventListener: () => {},
    }),
  });
});

afterEach(cleanup);

function exercise(id: string, overrides: Partial<LibraryExercise> = {}) {
  const name = id.charAt(0).toUpperCase() + id.slice(1);
  const base: LibraryExercise = {
    id,
    name,
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
    videoPath: "/videos/squat.mp4",
    archived: false,
  };

  return { ...base, ...overrides };
}

const squat = exercise("squat");
const lunge = exercise("lunge", {
  cues: "Step long",
  videoPath: null,
  primaryMuscles: ["Hamstrings"],
  secondaryMuscles: [],
  equipment: [],
});

const row: WeekRow = {
  id: "row-1",
  exerciseId: "squat",
  slot: "A",
  restSeconds: 90,
  lastSetTechnique: "none",
  substitutions: [],
  progression: { kind: "double" },
  cues: "",
  touched: [],
  sets: [
    { kind: "working", reps: { min: 6, max: 8 }, rir: 2 },
    { kind: "working", reps: { min: 6, max: 8 }, rir: 2 },
  ],
};

function detailOf(
  subject: LibraryExercise,
  extra: Partial<ExerciseDetailContent> = {},
) {
  return exerciseDetailOf(subject, { targets: rowTargets(row, ""), ...extra });
}

function renderDetail(detail: ExerciseDetailContent | null, subject = squat) {
  return render(
    <ExerciseDetailProvider
      footer={(shown) => (
        <button type="button">Edit {shown.name} in library</button>
      )}
    >
      <ExerciseNameButton exercise={subject} detail={detail} />
    </ExerciseDetailProvider>,
  );
}

describe("exercise detail", () => {
  it("opens from the exercise name with its video, cues, muscles, targets and footer, and returns focus on close", async () => {
    // arrange
    const user = userEvent.setup();
    renderDetail(detailOf(squat, { cues: "Brace\nDrive through the floor" }));
    const opener = screen.getByRole("button", {
      name: "Squat",
      description: "cues and video",
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // act
    await user.click(opener);

    // assert
    const dialog = screen.getByRole("dialog", { name: "Squat" });
    expect(within(dialog).getByLabelText("Squat video")).toBeInTheDocument();
    expect(
      within(dialog).getByRole("heading", { name: "Cues" }),
    ).toBeInTheDocument();
    expect(
      within(dialog)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["Brace", "Drive through the floor"]);
    expect(
      within(dialog).getByRole("heading", { name: "Muscles worked" }),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("Primary").nextSibling).toHaveTextContent(
      "Quadriceps",
    );
    expect(within(dialog).getByText("Secondary").nextSibling).toHaveTextContent(
      "Glutes",
    );
    expect(within(dialog).getByText("Equipment").nextSibling).toHaveTextContent(
      "Barbell",
    );
    expect(
      within(dialog).getByRole("heading", { name: "Targets" }),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("Working").nextSibling).toHaveTextContent(
      "2 sets × 6–8",
    );
    expect(
      within(dialog).getByRole("button", { name: "Edit Squat in library" }),
    ).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("says so when the exercise has no video", async () => {
    // arrange
    const user = userEvent.setup();
    renderDetail(detailOf(lunge), lunge);

    // act
    await user.click(
      screen.getByRole("button", {
        name: "Lunge",
        description: "cues",
      }),
    );

    // assert
    const dialog = screen.getByRole("dialog", { name: "Lunge" });
    expect(
      within(dialog).getByText("No video for this exercise yet."),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByLabelText("Lunge video"),
    ).not.toBeInTheDocument();
    expect(within(dialog).getByText("Step long")).toBeInTheDocument();
  });

  it("opens a swap with the same targets, goes back to the exercise and puts focus on the swap it came from", async () => {
    // arrange
    const user = userEvent.setup();
    renderDetail(
      detailOf(squat, { swaps: [lunge], swapContext: "Swap for A · Squat" }),
    );
    await user.click(screen.getByRole("button", { name: "Squat" }));
    const swaps = within(
      screen.getByRole("dialog", { name: "Squat" }),
    ).getByRole("list", { name: "Swaps for Squat" });

    // act
    await user.click(within(swaps).getByRole("button", { name: /^Lunge/ }));

    // assert
    const swapDialog = screen.getByRole("dialog", { name: "Lunge" });
    expect(
      within(swapDialog).getByText("Swap for A · Squat"),
    ).toBeInTheDocument();
    expect(
      within(swapDialog).getByRole("heading", {
        name: "Do it instead, with the same targets",
      }),
    ).toBeInTheDocument();
    expect(
      within(swapDialog).queryByRole("heading", { name: "Swaps" }),
    ).not.toBeInTheDocument();

    // act
    await user.click(
      within(swapDialog).getByRole("button", { name: "Back to Squat" }),
    );

    // assert
    expect(screen.getByRole("dialog", { name: "Squat" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Lunge/ })).toHaveFocus();
  });

  it("explains how to progress", async () => {
    // arrange
    const user = userEvent.setup();
    renderDetail(
      detailOf(squat, {
        progression: "Add 2.5 kg once every set moves cleanly.",
      }),
    );

    // act
    await user.click(screen.getByRole("button", { name: "Squat" }));

    // assert
    const dialog = screen.getByRole("dialog", { name: "Squat" });
    expect(
      within(dialog).getByRole("heading", { name: "How to progress" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("Add 2.5 kg once every set moves cleanly."),
    ).toBeInTheDocument();
  });

  it("shows an archived exercise as its name with an archived badge and no button", () => {
    // arrange
    const archived = exercise("squat", { archived: true });

    // act
    renderDetail(detailOf(archived), archived);

    // assert
    expect(screen.getByText("Squat")).toBeInTheDocument();
    expect(screen.getByText("archived")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("superset group", () => {
  it("lists its exercises under one Superset label beside its action", () => {
    // arrange
    // act
    render(
      <SupersetGroup action={<button type="button">Ungroup</button>}>
        <li>Squat</li>
        <li>Lunge</li>
      </SupersetGroup>,
    );

    // assert
    const group = screen.getByRole("list", { name: "Superset" });
    expect(within(group).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Ungroup" })).toBeInTheDocument();
  });
});

describe("swap rows", () => {
  it("shows a swap's equipment and opens it, or only names it when it is static", async () => {
    // arrange
    const user = userEvent.setup();
    const opened: string[] = [];

    // act
    render(
      <SwapRows
        label="Swaps for Squat"
        swaps={[squat, lunge]}
        actionFor={(swap) =>
          swap.id === "squat"
            ? { kind: "open", onOpen: () => opened.push(swap.id) }
            : { kind: "static" }
        }
        trailingFor={(swap) => (
          <button type="button">Remove {swap.name}</button>
        )}
      />,
    );
    await user.click(screen.getByRole("button", { name: /^Squat/ }));

    // assert
    const list = screen.getByRole("list", { name: "Swaps for Squat" });
    expect(within(list).getByText("Barbell")).toBeInTheDocument();
    expect(opened).toEqual(["squat"]);
    expect(
      within(list).queryByRole("button", { name: /^Lunge/ }),
    ).not.toBeInTheDocument();
    expect(
      within(list).getByRole("button", { name: "Remove Lunge" }),
    ).toBeInTheDocument();
  });
});

describe("editable routine", () => {
  it("titles its section and puts the action beside the title", () => {
    // arrange
    // act
    render(
      <EditableRoutine
        title="Warm-up"
        action={<button type="button">Add exercise</button>}
      >
        <p>Row</p>
      </EditableRoutine>,
    );

    // assert
    const section = screen.getByRole("region", { name: "Warm-up" });
    expect(
      within(section).getByRole("button", { name: "Add exercise" }),
    ).toBeInTheDocument();
  });
});

describe("text disclosure", () => {
  it("opens the panel its trigger controls and closes it again, one at a time", async () => {
    // arrange
    const user = userEvent.setup();
    render(
      <TextDisclosureGroup>
        <DisclosureTrigger value="details">
          <button type="button">Details</button>
        </DisclosureTrigger>
        <DisclosureTrigger value="notes">
          <button type="button">Notes</button>
        </DisclosureTrigger>
        <DisclosureContent value="details">
          <section aria-label="Details panel" />
        </DisclosureContent>
        <DisclosureContent value="notes">
          <section aria-label="Notes panel" />
        </DisclosureContent>
      </TextDisclosureGroup>,
    );
    const details = screen.getByRole("button", { name: "Details" });
    expect(details).toHaveAttribute("aria-expanded", "false");

    // act
    await user.click(details);

    // assert
    expect(details).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("region", { name: "Details panel" }),
    ).toBeInTheDocument();

    // act
    await user.click(screen.getByRole("button", { name: "Notes" }));

    // assert
    expect(
      screen.queryByRole("region", { name: "Details panel" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Notes panel" }),
    ).toBeInTheDocument();

    // act
    await user.click(screen.getByRole("button", { name: "Notes" }));

    // assert
    expect(
      screen.queryByRole("region", { name: "Notes panel" }),
    ).not.toBeInTheDocument();
  });
});
