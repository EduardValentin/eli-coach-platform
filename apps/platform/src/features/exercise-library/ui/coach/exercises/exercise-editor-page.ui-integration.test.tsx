// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { Toaster } from "@eli-coach-platform/ui/toast";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { createMemoryRouter, redirect, RouterProvider } from "react-router";
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

import { clientAction as editExercise } from "~/features/exercise-library/api/exercises/exercise";
import { clientAction as createExercise } from "~/features/exercise-library/api/exercises/exercises";
import type { ExerciseView } from "~/features/exercise-library/public/exercises";
import {
  COACH_TRAINING_PATH,
  EXERCISE_EDITOR_ROUTE_SEGMENT,
  EXERCISE_LIBRARY_API_PATHS,
  exerciseEditorPath,
  NEW_EXERCISE_PATH,
} from "~/features/exercise-library/public/paths";
import { frameworkModeAction } from "~/server/test-support/framework-mode-action";

import ExerciseEditorRoute from "./exercise-editor-page";
import ExerciseLibraryRoute from "./exercise-library-page";

const HIP_THRUST: ExerciseView = {
  id: "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
  name: "Hip thrust",
  type: "resistance",
  unit: "reps",
  perSide: false,
  primaryMuscles: ["Glutes"],
  secondaryMuscles: ["Hamstrings"],
  equipment: ["Barbell", "Bench"],
  difficulty: "Beginner",
  tags: ["Hypertrophy"],
  cues: "Chin tucked.",
};

const BREATH_HOLD: ExerciseView = {
  id: "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e",
  name: "Breath hold",
  type: "breathing",
  unit: "time",
  perSide: true,
  primaryMuscles: ["Core"],
  secondaryMuscles: [],
  equipment: ["Mat"],
  difficulty: "Advanced",
  tags: ["Recovery"],
  cues: "Exhale slowly.",
};

const LIBRARY = [BREATH_HOLD, HIP_THRUST];
const UNKNOWN_ID = "9e8d7c6b-5a49-4382-9716-a5b4c3d2e1f0";
const SAVE_FAILED = "We couldn't save the exercise. Try again in a moment.";

const server = setupServer();

let sentBodies: { method: string; path: string; body: unknown }[] = [];

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
  Element.prototype.scrollIntoView = () => {};
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.releasePointerCapture = () => {};
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
  sentBodies = [];
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
  vi.unstubAllGlobals();
});

describe("a new exercise", () => {
  it("starts on Resistance, measured in reps, both sides together and Beginner, with nothing else chosen and nothing flagged", async () => {
    // arrange, act
    await renderEditor(NEW_EXERCISE_PATH);

    // assert
    expect(
      screen.getByRole("heading", { level: 1, name: "New exercise" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "Type" })).toHaveTextContent(
      "Resistance",
    );
    expect(
      screen.getByRole("combobox", { name: "Measured in" }),
    ).toHaveTextContent(/^Reps$/);
    expect(
      screen.getByRole("radio", { name: "Both sides together" }),
    ).toBeChecked();
    expect(
      screen.getByRole("combobox", { name: "Difficulty" }),
    ).toHaveTextContent("Beginner");
    expect(
      screen.getByRole("button", { name: "Primary muscles" }),
    ).toHaveTextContent("Pick muscles");
    expect(
      screen.getByRole("button", { name: "Secondary muscles" }),
    ).toHaveTextContent("Pick muscles");
    expect(screen.getByRole("button", { name: "Equipment" })).toHaveTextContent(
      "Pick equipment",
    );
    expect(screen.getByText("Leave it empty for a bodyweight exercise."));
    for (const tag of ["Strength", "Hypertrophy", "Recovery"]) {
      expect(screen.getByRole("checkbox", { name: tag })).not.toBeChecked();
    }
    expect(screen.getByRole("textbox", { name: "Form cues" })).toHaveValue("");
    expect(screen.queryByText("Give the exercise a name")).toBeNull();
    expect(screen.queryByText("Pick at least one primary muscle")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Create exercise" }),
    ).toBeDisabled();
  });

  it("shows every problem under its field once she starts filling the form", async () => {
    // arrange
    const user = await renderEditor(NEW_EXERCISE_PATH);

    // act
    await user.type(screen.getByRole("textbox", { name: "Name" }), "B");

    // assert
    expect(screen.queryByText("Give the exercise a name")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Primary muscles" }),
    ).toHaveAccessibleDescription("Pick at least one primary muscle");
    expect(
      screen.getByRole("button", { name: "Primary muscles" }),
    ).toHaveAttribute("aria-invalid", "true");

    // act
    await user.clear(screen.getByRole("textbox", { name: "Name" }));

    // assert
    expect(
      screen.getByRole("textbox", { name: "Name" }),
    ).toHaveAccessibleDescription("Give the exercise a name");
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it.each([
    {
      entered: "  hip THRUST ",
      problem: "An exercise with this name already exists",
    },
    { entered: "n".repeat(81), problem: "Keep the name to 80 characters" },
  ])(
    "refuses the name $entered with “$problem” and keeps Create disabled",
    async ({ entered, problem }) => {
      // arrange
      const user = await renderEditor(NEW_EXERCISE_PATH);
      await pickMuscles(user, "Primary muscles", ["Glutes"]);

      // act
      await enter(user, "Name", entered);

      // assert
      expect(
        screen.getByRole("textbox", { name: "Name" }),
      ).toHaveAccessibleDescription(problem);
      expect(
        screen.getByRole("button", { name: "Create exercise" }),
      ).toBeDisabled();
    },
  );

  it("counts the name's length after trimming the spaces around it", async () => {
    // arrange
    const user = await renderEditor(NEW_EXERCISE_PATH);
    await pickMuscles(user, "Primary muscles", ["Glutes"]);

    // act
    await enter(user, "Name", `  ${"n".repeat(80)}  `);

    // assert
    expect(screen.getByRole("textbox", { name: "Name" })).not.toHaveAttribute(
      "aria-invalid",
    );
    expect(
      screen.getByRole("button", { name: "Create exercise" }),
    ).toBeEnabled();
  });

  it("refuses form cues over 1,000 characters and keeps everything she typed", async () => {
    // arrange
    const user = await renderEditor(NEW_EXERCISE_PATH);
    await enter(user, "Name", "Glute bridge");
    await pickMuscles(user, "Primary muscles", ["Glutes"]);

    // act
    await enter(user, "Form cues", "c".repeat(1_001));

    // assert
    const cues = screen.getByRole("textbox", { name: "Form cues" });
    expect(cues).toHaveAccessibleDescription(
      "Keep the form cues to 1,000 characters",
    );
    expect(cues).toHaveValue("c".repeat(1_001));
    expect(
      screen.getByRole("button", { name: "Create exercise" }),
    ).toBeDisabled();
  });

  it("asks for no primary muscle on a cardio exercise", async () => {
    // arrange
    const user = await renderEditor(NEW_EXERCISE_PATH);
    await enter(user, "Name", "Easy run");

    // act
    await choose(user, "Type", "Cardio");

    // assert
    expect(screen.queryByText("Pick at least one primary muscle")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Create exercise" }),
    ).toBeEnabled();
  });

  it("creates the exercise and returns to the library with a confirmation", async () => {
    // arrange
    acceptSaves();
    const user = await renderEditor(NEW_EXERCISE_PATH);
    await enter(user, "Name", "  Glute bridge ");
    await choose(user, "Measured in", /^Time/);
    await user.click(screen.getByRole("radio", { name: "One side at a time" }));
    await pickMuscles(user, "Primary muscles", ["Glutes"]);
    await pickMuscles(user, "Secondary muscles", ["Hamstrings", "Core"]);
    await pickMuscles(user, "Equipment", ["Mat"]);
    await choose(user, "Difficulty", "Intermediate");
    await user.click(screen.getByRole("checkbox", { name: "Strength" }));
    await enter(user, "Form cues", "Squeeze at the top.");

    // act
    await user.click(screen.getByRole("button", { name: "Create exercise" }));

    // assert
    expect(
      await screen.findByRole("heading", { level: 1, name: "Exercises" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Exercise created")).toBeInTheDocument();
    expect(sentBodies).toEqual([
      {
        method: "POST",
        path: EXERCISE_LIBRARY_API_PATHS.exercises,
        body: {
          name: "  Glute bridge ",
          type: "resistance",
          unit: "time",
          perSide: true,
          primaryMuscles: ["Glutes"],
          secondaryMuscles: ["Hamstrings", "Core"],
          equipment: ["Mat"],
          difficulty: "Intermediate",
          tags: ["Strength"],
          cues: "Squeeze at the top.",
        },
      },
    ]);
  });

  it("shows a name taken while she was filling the form on the name field and keeps her entries", async () => {
    // arrange
    server.use(
      http.post(`*${EXERCISE_LIBRARY_API_PATHS.exercises}`, () =>
        HttpResponse.json({ problems: { name: "taken" } }, { status: 422 }),
      ),
    );
    const user = await renderEditor(NEW_EXERCISE_PATH);
    await enter(user, "Name", "Glute bridge");
    await pickMuscles(user, "Primary muscles", ["Glutes"]);

    // act
    await user.click(screen.getByRole("button", { name: "Create exercise" }));

    // assert
    const name = screen.getByRole("textbox", { name: "Name" });
    expect(
      await screen.findByText("An exercise with this name already exists"),
    ).toBeInTheDocument();
    expect(name).toHaveAccessibleDescription(
      "An exercise with this name already exists",
    );
    expect(name).toHaveValue("Glute bridge");
    expect(
      screen.getByRole("button", { name: "Primary muscles, 1 selected" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create exercise" }),
    ).toBeDisabled();

    // act
    await user.click(screen.getByRole("checkbox", { name: "Strength" }));

    // assert
    expect(name).toHaveAccessibleDescription(
      "An exercise with this name already exists",
    );

    // act
    await enter(user, "Name", "Single-leg glute bridge");

    // assert
    expect(name).not.toHaveAttribute("aria-invalid");
    expect(
      screen.getByRole("button", { name: "Create exercise" }),
    ).toBeEnabled();
  });

  it("words a save the server could not make as a failure and keeps her entries", async () => {
    // arrange
    server.use(
      http.post(
        `*${EXERCISE_LIBRARY_API_PATHS.exercises}`,
        () => new HttpResponse("Internal Server Error", { status: 500 }),
      ),
    );
    const user = await renderEditor(NEW_EXERCISE_PATH);
    await enter(user, "Name", "Glute bridge");
    await pickMuscles(user, "Primary muscles", ["Glutes"]);

    // act
    await user.click(screen.getByRole("button", { name: "Create exercise" }));

    // assert
    expect(await screen.findByText(SAVE_FAILED)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue(
      "Glute bridge",
    );
    expect(
      screen.getByRole("button", { name: "Create exercise" }),
    ).toBeEnabled();
  });
});

describe("the unit following the type", () => {
  it("offers only the units the type allows, the first one by default", async () => {
    // arrange
    const user = await renderEditor(NEW_EXERCISE_PATH);

    // act
    await choose(user, "Type", "Cardio");

    // assert
    expect(
      screen.getByRole("combobox", { name: "Measured in" }),
    ).toHaveTextContent(/^Time$/);
    expect(await unitsOffered(user)).toEqual([
      "Time e.g. 45 s hold",
      "Distance e.g. 400 m",
    ]);
  });

  it("keeps the unit she picked when the new type allows it", async () => {
    // arrange
    const user = await renderEditor(NEW_EXERCISE_PATH);
    await choose(user, "Measured in", /^Distance/);

    // act
    await choose(user, "Type", "Cardio");

    // assert
    expect(
      screen.getByRole("combobox", { name: "Measured in" }),
    ).toHaveTextContent(/^Distance$/);
  });

  it("resets to the new type's default when it does not, and forgets her pick", async () => {
    // arrange
    const user = await renderEditor(NEW_EXERCISE_PATH);
    await choose(user, "Measured in", /^Distance/);

    // act
    await choose(user, "Type", "Mobility");

    // assert
    expect(
      screen.getByRole("combobox", { name: "Measured in" }),
    ).toHaveTextContent(/^Time$/);

    // act
    await choose(user, "Type", "Resistance");

    // assert
    expect(
      screen.getByRole("combobox", { name: "Measured in" }),
    ).toHaveTextContent(/^Reps$/);
  });

  it("counts a saved unit other than the type's default as her pick", async () => {
    // arrange
    const user = await renderEditor(exerciseEditorPath(BREATH_HOLD.id));

    // act
    await choose(user, "Type", "Resistance");

    // assert
    expect(
      screen.getByRole("combobox", { name: "Measured in" }),
    ).toHaveTextContent(/^Time$/);
  });
});

describe("primary and secondary muscles", () => {
  it("takes a muscle made primary out of the secondary muscles and offers only the others there", async () => {
    // arrange
    const user = await renderEditor(exerciseEditorPath(HIP_THRUST.id));

    // act
    await pickMuscles(user, "Primary muscles, 1 selected", ["Hamstrings"]);

    // assert
    expect(
      screen.getByRole("button", { name: "Secondary muscles" }),
    ).toHaveTextContent("Pick muscles");

    // act
    await user.click(screen.getByRole("button", { name: "Secondary muscles" }));

    // assert
    const offered = within(
      await screen.findByRole("list", { name: "Secondary muscles" }),
    )
      .getAllByRole("listitem")
      .map((option) => option.textContent);
    expect(offered).toHaveLength(17);
    expect(offered).not.toContain("Glutes");
    expect(offered).not.toContain("Hamstrings");
  });
});

describe("editing an exercise", () => {
  it("opens with the exercise's saved values", async () => {
    // arrange, act
    await renderEditor(exerciseEditorPath(BREATH_HOLD.id));

    // assert
    expect(
      screen.getByRole("heading", { level: 1, name: "Edit exercise" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue(
      "Breath hold",
    );
    expect(screen.getByRole("combobox", { name: "Type" })).toHaveTextContent(
      "Breathing",
    );
    expect(
      screen.getByRole("combobox", { name: "Measured in" }),
    ).toHaveTextContent(/^Time$/);
    expect(
      screen.getByRole("radio", { name: "One side at a time" }),
    ).toBeChecked();
    expect(
      screen.getByRole("button", { name: "Primary muscles, 1 selected" }),
    ).toHaveTextContent("Core");
    expect(
      screen.getByRole("button", { name: "Equipment, 1 selected" }),
    ).toHaveTextContent("Mat");
    expect(
      screen.getByRole("combobox", { name: "Difficulty" }),
    ).toHaveTextContent("Advanced");
    expect(screen.getByRole("checkbox", { name: "Recovery" })).toBeChecked();
    expect(screen.getByRole("textbox", { name: "Form cues" })).toHaveValue(
      "Exhale slowly.",
    );
    expect(
      await screen.findByRole("button", {
        name: "Save changes",
        disabled: false,
      }),
    ).toBeEnabled();
  });

  it("keeps its own name free while flagging another exercise's", async () => {
    // arrange
    const user = await renderEditor(exerciseEditorPath(BREATH_HOLD.id));

    // act
    await enter(user, "Name", "BREATH HOLD");

    // assert
    expect(screen.getByRole("textbox", { name: "Name" })).not.toHaveAttribute(
      "aria-invalid",
    );

    // act
    await enter(user, "Name", "Hip thrust");

    // assert
    expect(
      screen.getByRole("textbox", { name: "Name" }),
    ).toHaveAccessibleDescription("An exercise with this name already exists");
  });

  it("saves the whole exercise and returns to the library with a confirmation", async () => {
    // arrange
    acceptSaves();
    const user = await renderEditor(exerciseEditorPath(BREATH_HOLD.id));
    await enter(user, "Name", "Long breath hold");

    // act
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    // assert
    expect(
      await screen.findByRole("heading", { level: 1, name: "Exercises" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Exercise updated")).toBeInTheDocument();
    expect(sentBodies).toEqual([
      {
        method: "PUT",
        path: `${EXERCISE_LIBRARY_API_PATHS.exercises}/${BREATH_HOLD.id}`,
        body: {
          name: "Long breath hold",
          type: "breathing",
          unit: "time",
          perSide: true,
          primaryMuscles: ["Core"],
          secondaryMuscles: [],
          equipment: ["Mat"],
          difficulty: "Advanced",
          tags: ["Recovery"],
          cues: "Exhale slowly.",
        },
      },
    ]);
  });

  it("returns to the library for an exercise the library does not hold", async () => {
    // arrange, act
    await renderEditor(exerciseEditorPath(UNKNOWN_ID), "Exercises");

    // assert
    expect(screen.getByRole("link", { name: "New exercise" })).toBeVisible();
  });

  it.each(["Cancel", "Back to exercises"])(
    "returns to the library through %s without saving",
    async (leave) => {
      // arrange
      const user = await renderEditor(exerciseEditorPath(BREATH_HOLD.id));
      await enter(user, "Name", "Long breath hold");

      // act
      await user.click(screen.getByRole("link", { name: leave }));

      // assert
      expect(
        await screen.findByRole("heading", { level: 1, name: "Exercises" }),
      ).toBeInTheDocument();
      expect(sentBodies).toEqual([]);
    },
  );
});

function acceptSaves() {
  const record = async ({ request }: { request: Request }) => {
    sentBodies.push({
      method: request.method,
      path: new URL(request.url).pathname,
      body: await request.json(),
    });

    return HttpResponse.json({ redirectTo: COACH_TRAINING_PATH });
  };

  server.use(
    http.post(`*${EXERCISE_LIBRARY_API_PATHS.exercises}`, record),
    http.put(`*${EXERCISE_LIBRARY_API_PATHS.exercises}/:exerciseId`, record),
  );
}

async function enter(user: UserEvent, field: string, text: string) {
  const entry = screen.getByRole("textbox", { name: field });
  await user.clear(entry);
  await user.click(entry);
  await user.paste(text);
}

async function choose(user: UserEvent, field: string, option: string | RegExp) {
  await user.click(screen.getByRole("combobox", { name: field }));
  await user.click(await screen.findByRole("option", { name: option }));
}

async function unitsOffered(user: UserEvent): Promise<string[]> {
  await user.click(screen.getByRole("combobox", { name: "Measured in" }));

  return (await screen.findAllByRole("option")).map(
    (option) => option.textContent ?? "",
  );
}

async function pickMuscles(
  user: UserEvent,
  trigger: string,
  picks: readonly string[],
) {
  await user.click(screen.getByRole("button", { name: trigger }));
  for (const pick of picks) {
    await user.click(await screen.findByRole("checkbox", { name: pick }));
  }
  await user.keyboard("{Escape}");
}

async function renderEditor(entry: string, heading?: string) {
  const user = userEvent.setup();
  const router = createMemoryRouter(
    [
      {
        Component: ExerciseLibraryRoute,
        loader: () => ({ exercises: LIBRARY }),
        path: COACH_TRAINING_PATH,
      },
      {
        Component: ExerciseEditorRoute,
        loader: () => ({
          exercise: null,
          otherNames: LIBRARY.map(({ name }) => name),
        }),
        path: NEW_EXERCISE_PATH,
      },
      {
        Component: ExerciseEditorRoute,
        loader: ({ params }) => {
          const exercise = LIBRARY.find(({ id }) => id === params.exerciseId);

          if (!exercise) {
            throw redirect(COACH_TRAINING_PATH);
          }

          return {
            exercise,
            otherNames: LIBRARY.filter(({ id }) => id !== exercise.id).map(
              ({ name }) => name,
            ),
          };
        },
        path: `/coach/${EXERCISE_EDITOR_ROUTE_SEGMENT}`,
      },
      {
        action: frameworkModeAction(createExercise),
        path: EXERCISE_LIBRARY_API_PATHS.exercises,
      },
      {
        action: frameworkModeAction(editExercise),
        path: EXERCISE_LIBRARY_API_PATHS.exercise,
      },
    ],
    { initialEntries: [entry] },
  );

  render(
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>,
  );
  await screen.findByRole("heading", {
    level: 1,
    name: heading ?? /exercise$/,
  });

  return user;
}
