// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { configureAxe } from "vitest-axe";

import type { ExerciseWire } from "~/features/exercises/contracts/exercises";

import ExerciseLibraryRoute from "./exercise-library-page";

const axe = configureAxe({
  rules: {
    "color-contrast": { enabled: false },
  },
});

afterEach(() => {
  cleanup();
});

const baseWire: ExerciseWire = {
  id: "a",
  name: "Barbell Back Squat",
  description: "",
  difficulty: "Intermediate",
  equipment: ["Barbell"],
  primaryMuscles: ["Quadriceps", "Glutes"],
  secondaryMuscles: [],
  tags: ["Strength", "Hypertrophy"],
  video: { url: "/api/exercises/videos/exercise-videos%2Fabc.mp4", sizeBytes: 3 },
  createdAt: "2026-09-02T00:00:00.000Z",
  updatedAt: "2026-09-02T00:00:00.000Z",
};
const squat = baseWire;
const deadlift: ExerciseWire = {
  ...baseWire,
  id: "b",
  name: "Romanian Deadlift",
  primaryMuscles: ["Hamstrings", "Glutes"],
  tags: ["Strength", "Recovery"],
  video: null,
};
const plank: ExerciseWire = {
  ...baseWire,
  id: "c",
  name: "Plank",
  difficulty: "Beginner",
  equipment: [],
  primaryMuscles: ["Core"],
  tags: ["Recovery"],
  video: null,
};
const pushUp: ExerciseWire = {
  ...baseWire,
  id: "d",
  name: "Push-Up",
  difficulty: "Beginner",
  equipment: ["Bodyweight"],
  primaryMuscles: ["Chest"],
  tags: ["Hypertrophy"],
  video: null,
};
const library = [squat, deadlift, plank, pushUp];

function renderLibrary(exercises: ExerciseWire[]) {
  const router = createMemoryRouter(
    [
      {
        path: "/coach/training/exercises",
        Component: ExerciseLibraryRoute,
        loader: () => ({ exercises }),
      },
    ],
    { initialEntries: ["/coach/training/exercises"] },
  );

  // The portal shell provides the main landmark in production.
  return render(
    <main>
      <RouterProvider router={router} />
    </main>,
  );
}

const tagChip = (name: string) =>
  within(screen.getByRole("group", { name: "Tags" })).getByRole("button", { name });
const noEquipmentChip = () =>
  within(screen.getByRole("group", { name: "Equipment" })).getByRole("button", {
    name: "No equipment",
  });
const rowOf = (name: string) => screen.getByText(name).closest("tr") as HTMLElement;
const clearActions = () =>
  screen.getAllByRole("button", { name: "Clear search and filters" });

describe("the Exercise Library", () => {
  it("lists every exercise with its equipment, muscles, difficulty, tags and video state", async () => {
    // arrange, act
    renderLibrary([squat, plank]);

    // assert
    const row = (await screen.findByText("Barbell Back Squat")).closest("tr") as HTMLElement;
    expect(within(row).getByText("Barbell")).toBeInTheDocument();
    expect(within(row).getByText("Quadriceps")).toBeInTheDocument();
    expect(within(row).getByText("Intermediate")).toBeInTheDocument();
    expect(within(row).getByText("Strength")).toBeInTheDocument();
    expect(within(row).getByText("Attached")).toBeInTheDocument();
    expect(within(row).getByRole("link", { name: "Edit Barbell Back Squat" })).toHaveAttribute(
      "href",
      "/coach/training/exercises/a/edit",
    );
    expect(within(rowOf("Plank")).getByText("None")).toBeInTheDocument();
  });

  it("narrows by a tag, widens with a second, and intersects with the equipment switch", async () => {
    // arrange
    const user = userEvent.setup();
    renderLibrary(library);
    await screen.findByText("Plank");

    // act — one tag
    await user.click(tagChip("Recovery"));

    // assert
    expect(screen.getByText("Romanian Deadlift")).toBeInTheDocument();
    expect(screen.getByText("Plank")).toBeInTheDocument();
    expect(screen.queryByText("Barbell Back Squat")).not.toBeInTheDocument();

    // act — a second tag widens
    await user.click(tagChip("Strength"));

    // assert
    expect(screen.getByText("Barbell Back Squat")).toBeInTheDocument();
    expect(screen.getByText("Plank")).toBeInTheDocument();

    // act — the equipment switch intersects
    await user.click(tagChip("Strength"));
    await user.click(noEquipmentChip());

    // assert — both are Recovery-tagged, but the deadlift needs a barbell
    expect(screen.getByText("Plank")).toBeInTheDocument();
    expect(screen.queryByText("Romanian Deadlift")).not.toBeInTheDocument();
    expect(noEquipmentChip()).toHaveAttribute("aria-pressed", "true");
  });

  it("treats a Bodyweight exercise as needing no equipment", async () => {
    // arrange
    const user = userEvent.setup();
    renderLibrary(library);
    await screen.findByText("Push-Up");

    // act
    await user.click(noEquipmentChip());

    // assert
    expect(screen.getByText("Push-Up")).toBeInTheDocument();
    expect(screen.getByText("Plank")).toBeInTheDocument();
    expect(screen.queryByText("Barbell Back Squat")).not.toBeInTheDocument();
  });

  it("combines the filters with the search and offers a way out of the no-match state", async () => {
    // arrange
    const user = userEvent.setup();
    renderLibrary(library);
    const search = await screen.findByPlaceholderText("Search exercises by name or muscle...");

    // act — every "squat" match is Strength- or Hypertrophy-tagged
    await user.type(search, "squat");
    await user.click(tagChip("Recovery"));

    // assert
    expect(screen.getByText("No exercises match your search and filters.")).toBeInTheDocument();
    // The column headers stay, as in the prototype; only the rows go.
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.queryByRole("row", { name: /Barbell Back Squat/ })).not.toBeInTheDocument();

    // act — the empty state's own clear action
    await user.click(clearActions().at(-1)!);

    // assert
    expect(screen.getByText("Barbell Back Squat")).toBeInTheDocument();
    expect(search).toHaveValue("");
    expect(tagChip("Recovery")).toHaveAttribute("aria-pressed", "false");
  });

  it("clears from the keyboard and leaves the library intact when nothing is filtered", async () => {
    // arrange
    const user = userEvent.setup();
    renderLibrary(library);
    await screen.findByText("Plank");
    const clear = clearActions()[0]!;
    clear.focus();

    // act
    await user.keyboard("{Enter}");

    // assert
    expect(document.activeElement).toBe(clear);
    expect(screen.getByText("Barbell Back Squat")).toBeInTheDocument();
  });

  it("searches primary muscles as well as names", async () => {
    // arrange
    const user = userEvent.setup();
    renderLibrary(library);
    const search = await screen.findByPlaceholderText("Search exercises by name or muscle...");

    // act
    await user.type(search, "core");

    // assert
    expect(screen.getByText("Plank")).toBeInTheDocument();
    expect(screen.queryByText("Barbell Back Squat")).not.toBeInTheDocument();
  });

  it("shows the empty-library state when nothing has been created yet", async () => {
    // arrange, act
    renderLibrary([]);

    // assert
    expect(
      await screen.findByText("No exercises yet. Create your first exercise."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Tags" })).not.toBeInTheDocument();
  });

  it("has no obvious accessibility violations", async () => {
    // arrange
    const { baseElement } = renderLibrary([squat, plank]);
    await screen.findByText("Plank");

    // act
    const results = await axe(baseElement);

    // assert
    expect(results.violations).toEqual([]);
  });
});
