// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider, useParams } from "react-router";
import { afterEach, describe, expect, it } from "vitest";

import type {
  ExerciseLibraryView,
  ExerciseView,
} from "~/features/exercise-library/public/exercises";
import {
  COACH_TRAINING_PATH,
  EXERCISE_EDITOR_ROUTE_SEGMENT,
  NEW_EXERCISE_PATH,
} from "~/features/exercise-library/public/paths";

import ExerciseLibraryRoute from "./exercise-library-page";

const BACK_SQUAT: ExerciseView = {
  id: "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
  name: "Back squat",
  type: "resistance",
  unit: "reps",
  perSide: false,
  primaryMuscles: ["Quadriceps", "Glutes"],
  secondaryMuscles: ["Core"],
  equipment: ["Barbell", "Squat rack"],
  difficulty: "Intermediate",
  tags: ["Strength", "Hypertrophy"],
  cues: "Brace, then sit between the hips.",
};

const BOX_BREATHING: ExerciseView = {
  id: "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e",
  name: "Box breathing",
  type: "breathing",
  unit: "breaths",
  perSide: false,
  primaryMuscles: ["Core"],
  secondaryMuscles: [],
  equipment: [],
  difficulty: "Beginner",
  tags: [],
  cues: "",
};

afterEach(() => {
  cleanup();
});

describe("the coach's exercise library", () => {
  it("names the page and offers a new exercise", async () => {
    // arrange, act
    await renderLibrary({ exercises: [BACK_SQUAT] });

    // assert
    expect(
      screen.getByText("Build the exercise library your plans draw from."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "New exercise" })).toHaveAttribute(
      "href",
      NEW_EXERCISE_PATH,
    );
  });

  it("lists every exercise in the library's order with its type, equipment, tags, primary muscles and difficulty", async () => {
    // arrange, act
    await renderLibrary({ exercises: [BACK_SQUAT, BOX_BREATHING] });

    // assert
    expect(
      screen.getAllByRole("columnheader").map((header) => header.textContent),
    ).toEqual(["Exercise", "Tags", "Target muscles", "Difficulty", "Actions"]);
    expect(rowTexts()).toEqual([
      [
        "Back squatResistance · Barbell, Squat rack",
        "StrengthHypertrophy",
        "QuadricepsGlutes",
        "Intermediate",
        "",
      ],
      ["Box breathingBreathing · No equipment", "", "Core", "Beginner", ""],
    ]);
  });

  it("opens an exercise's editor from Edit in its row menu", async () => {
    // arrange
    const user = userEvent.setup();
    await renderLibrary({ exercises: [BACK_SQUAT, BOX_BREATHING] });

    // act
    await user.click(
      screen.getByRole("button", { name: "Actions for Box breathing" }),
    );
    await user.click(await screen.findByRole("menuitem", { name: "Edit" }));

    // assert
    expect(
      await screen.findByRole("heading", {
        name: `Editing ${BOX_BREATHING.id}`,
      }),
    ).toBeInTheDocument();
  });

  it("holds nothing but Edit in a row menu", async () => {
    // arrange
    const user = userEvent.setup();
    await renderLibrary({ exercises: [BACK_SQUAT] });

    // act
    await user.click(
      screen.getByRole("button", { name: "Actions for Back squat" }),
    );

    // assert
    expect(
      (await screen.findAllByRole("menuitem")).map((item) => item.textContent),
    ).toEqual(["Edit"]);
  });

  it("tells her the library is empty until she adds an exercise", async () => {
    // arrange, act
    await renderLibrary({ exercises: [] });

    // assert
    expect(screen.getByText("No exercises yet")).toBeInTheDocument();
    expect(
      screen.getByText("Exercises you add appear here."),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(2);
  });
});

function EditorStandIn() {
  const { exerciseId } = useParams();

  return <h1>{`Editing ${exerciseId}`}</h1>;
}

function rowTexts(): string[][] {
  const [, ...rows] = screen.getAllByRole("row");

  return rows.map((row) =>
    within(row)
      .getAllByRole("cell")
      .map((cell) => cell.textContent ?? ""),
  );
}

async function renderLibrary(library: ExerciseLibraryView) {
  const router = createMemoryRouter(
    [
      {
        Component: ExerciseLibraryRoute,
        loader: () => library,
        path: COACH_TRAINING_PATH,
      },
      {
        Component: () => <h1>New exercise</h1>,
        path: NEW_EXERCISE_PATH,
      },
      {
        Component: EditorStandIn,
        path: `/coach/${EXERCISE_EDITOR_ROUTE_SEGMENT}`,
      },
    ],
    { initialEntries: [COACH_TRAINING_PATH] },
  );

  render(<RouterProvider router={router} />);
  await screen.findByRole("heading", { level: 1, name: "Exercises" });
}
