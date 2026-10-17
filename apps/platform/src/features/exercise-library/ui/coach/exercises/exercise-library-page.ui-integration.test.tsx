// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { Toaster } from "@eli-coach-platform/ui/toast";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import {
  createMemoryRouter,
  RouterProvider,
  useLocation,
  useParams,
} from "react-router";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { clientAction as removeExercise } from "~/features/exercise-library/api/exercises/exercise";
import { clientAction as archiveExercise } from "~/features/exercise-library/api/exercises/exercise-archive";
import { clientAction as restoreExercise } from "~/features/exercise-library/api/exercises/exercise-restore";
import type {
  ExerciseLibraryView,
  ExerciseView,
} from "~/features/exercise-library/public/exercises";
import {
  COACH_TRAINING_PATH,
  EXERCISE_EDITOR_ROUTE_SEGMENT,
  EXERCISE_LIBRARY_API_PATHS,
  NEW_EXERCISE_PATH,
} from "~/features/exercise-library/public/paths";
import { frameworkModeAction } from "~/server/test-support/framework-mode-action";

import ExerciseLibraryRoute, {
  shouldRevalidate,
} from "./exercise-library-page";

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
  video: {
    path: "/api/exercises/1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d/video/7c6b5a49-3827-4161-a5b4-c3d2e1f0a9b8",
    format: "mp4",
  },
  status: "active",
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
  video: null,
  status: "active",
};

const CAT_COW: ExerciseView = {
  ...BOX_BREATHING,
  id: "3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f",
  name: "Cat-cow",
  type: "mobility",
  unit: "reps",
  primaryMuscles: ["Lower back"],
  tags: ["Recovery"],
};

const DEADLIFT: ExerciseView = {
  ...BACK_SQUAT,
  id: "4d5e6f7a-8b9c-4d0e-9f1a-2b3c4d5e6f7a",
  name: "Deadlift",
  primaryMuscles: ["Hamstrings", "Glutes"],
  equipment: ["Barbell"],
  difficulty: "Advanced",
  tags: ["Strength"],
  video: null,
};

const HIP_THRUST: ExerciseView = {
  ...BACK_SQUAT,
  id: "5e6f7a8b-9c0d-4e1f-8a2b-3c4d5e6f7a8b",
  name: "Hip thrust",
  primaryMuscles: ["Glutes"],
  equipment: ["Barbell", "Bench"],
  difficulty: "Beginner",
  tags: ["Hypertrophy"],
  video: null,
};

const JUMP_ROPE: ExerciseView = {
  ...BOX_BREATHING,
  id: "6f7a8b9c-0d1e-4f2a-9b3c-4d5e6f7a8b9c",
  name: "Jump rope",
  type: "cardio",
  unit: "time",
  primaryMuscles: ["Calves"],
  equipment: ["Jump rope"],
  difficulty: "Intermediate",
};

const LIBRARY = [
  JUMP_ROPE,
  DEADLIFT,
  BACK_SQUAT,
  HIP_THRUST,
  CAT_COW,
  BOX_BREATHING,
];

const WALKING_LUNGE: ExerciseView = {
  ...DEADLIFT,
  id: "7a8b9c0d-1e2f-4a3b-8c4d-5e6f7a8b9c0d",
  name: "Walking lunge",
  primaryMuscles: ["Quadriceps", "Glutes"],
  equipment: ["Dumbbells"],
  difficulty: "Beginner",
  tags: ["Strength"],
  status: "archived",
};

const SIDE_PLANK: ExerciseView = {
  ...CAT_COW,
  id: "8b9c0d1e-2f3a-4b4c-9d5e-6f7a8b9c0d1e",
  name: "Side plank",
  primaryMuscles: ["Obliques"],
  tags: [],
  status: "archived",
};

const LIBRARY_WITH_ARCHIVE = [...LIBRARY, WALKING_LUNGE, SIDE_PLANK];

const HEADING = "Exercises";

const server = setupServer();

const ELEVEN_EXERCISES: ExerciseView[] = Array.from(
  { length: 11 },
  (_, index) => ({
    ...BOX_BREATHING,
    id: `exercise-${index + 1}`,
    name: `Exercise ${String(index + 1).padStart(2, "0")}`,
  }),
);

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
  Element.prototype.scrollIntoView = () => {};
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
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

  it("lists every exercise A to Z with its type, equipment, tags, primary muscles, difficulty and whether a video is attached", async () => {
    // arrange, act
    await renderLibrary({ exercises: [BOX_BREATHING, BACK_SQUAT] });

    // assert
    expect(
      screen.getAllByRole("columnheader").map((header) => header.textContent),
    ).toEqual([
      "Exercise",
      "Tags",
      "Target muscles",
      "Difficulty",
      "Video",
      "Actions",
    ]);
    expect(rowTexts()).toEqual([
      [
        "Back squatResistance · Barbell, Squat rack",
        "StrengthHypertrophy",
        "QuadricepsGlutes",
        "Intermediate",
        "Attached",
        "",
      ],
      [
        "Box breathingBreathing · No equipment",
        "",
        "Core",
        "Beginner",
        "—",
        "",
      ],
    ]);
  });

  it("opens an exercise's editor from Edit in its row menu", async () => {
    // arrange
    const { user } = await renderLibrary({
      exercises: [BACK_SQUAT, BOX_BREATHING],
    });

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

  it("offers Edit, Archive and Delete for an active exercise", async () => {
    // arrange
    const { user } = await renderLibrary({ exercises: [BACK_SQUAT] });

    // act
    await user.click(
      screen.getByRole("button", { name: "Actions for Back squat" }),
    );

    // assert
    expect(
      (await screen.findAllByRole("menuitem")).map((item) => item.textContent),
    ).toEqual(["Edit", "Archive", "Delete"]);
  });

  it("offers Restore and Delete for an archived exercise", async () => {
    // arrange
    const { user } = await renderLibrary(
      { exercises: LIBRARY_WITH_ARCHIVE },
      `${COACH_TRAINING_PATH}?status=archived`,
    );

    // act
    await user.click(
      screen.getByRole("button", { name: "Actions for Walking lunge" }),
    );

    // assert
    expect(
      (await screen.findAllByRole("menuitem")).map((item) => item.textContent),
    ).toEqual(["Restore", "Delete"]);
  });

  it("tells her the library is empty until she adds an exercise, with nothing to clear", async () => {
    // arrange, act
    await renderLibrary({ exercises: [] }, `${COACH_TRAINING_PATH}?q=squat`);

    // assert
    expect(screen.getByText("No exercises yet")).toBeInTheDocument();
    expect(
      screen.getByText("Exercises you add appear here."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Clear filters" }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(2);
    expect(screen.getAllByRole("cell")[0]).toHaveAttribute("colspan", "6");
  });
});

describe("narrowing the library", () => {
  it("counts each type under the tags chosen and narrows to the one she picks", async () => {
    // arrange
    const { router, user } = await renderLibrary(
      { exercises: LIBRARY },
      `${COACH_TRAINING_PATH}?tags=Strength,Recovery`,
    );

    // act
    await user.click(screen.getByRole("combobox", { name: "Type" }));
    const offered = screen
      .getAllByRole("option")
      .map((option) => option.textContent);
    await user.click(screen.getByRole("option", { name: "Mobility 1" }));

    // assert
    expect(offered).toEqual([
      "Any type 3",
      "Resistance 2",
      "Cardio 0",
      "Mobility 1",
      "Stretching 0",
      "Breathing 0",
    ]);
    await waitFor(() => {
      expect(addressOf(router)).toEqual({
        tags: "Strength,Recovery",
        type: "mobility",
      });
    });
    expect(shownExerciseNames()).toEqual(["Cat-cow"]);
    expect(screen.getByRole("combobox", { name: "Type" })).toHaveTextContent(
      /^Mobility$/,
    );
  });

  it("keeps any type out of the address", async () => {
    // arrange
    const { router, user } = await renderLibrary(
      { exercises: LIBRARY },
      `${COACH_TRAINING_PATH}?type=cardio`,
    );

    // act
    await user.click(screen.getByRole("combobox", { name: "Type" }));
    await user.click(screen.getByRole("option", { name: /^Any type \d+$/ }));

    // assert
    await waitFor(() => {
      expect(addressOf(router)).toEqual({});
    });
    expect(shownExerciseNames()).toHaveLength(LIBRARY.length);
  });

  it("matches any of the tags she picks and counts each tag under the type", async () => {
    // arrange
    const { router, user } = await renderLibrary(
      { exercises: LIBRARY },
      `${COACH_TRAINING_PATH}?type=resistance`,
    );

    // act
    await user.click(screen.getByRole("button", { name: "Tags" }));
    const recovery = screen.getByRole("checkbox", { name: /^Recovery\s*0$/ });
    await user.click(screen.getByRole("checkbox", { name: /^Strength\s*2$/ }));
    await user.click(
      await screen.findByRole("checkbox", { name: /^Hypertrophy\s*2$/ }),
    );

    // assert
    expect(recovery).toBeInTheDocument();
    await waitFor(() => {
      expect(addressOf(router)).toEqual({
        tags: "Strength,Hypertrophy",
        type: "resistance",
      });
    });
    expect(shownExerciseNames()).toEqual([
      "Back squat",
      "Deadlift",
      "Hip thrust",
    ]);
    expect(
      screen.getByRole("button", { name: "Tags, 2 selected" }),
    ).toBeInTheDocument();
  });

  it("narrows to exercises that need no equipment and counts both choices under the tags", async () => {
    // arrange
    const { router, user } = await renderLibrary(
      { exercises: LIBRARY },
      `${COACH_TRAINING_PATH}?tags=Strength,Recovery`,
    );

    // act
    await user.click(screen.getByRole("combobox", { name: "Equipment" }));
    const offered = screen
      .getAllByRole("option")
      .map((option) => option.textContent);
    await user.click(screen.getByRole("option", { name: "No equipment 1" }));

    // assert
    expect(offered).toEqual(["Any equipment 3", "No equipment 1"]);
    await waitFor(() => {
      expect(addressOf(router)).toEqual({
        equipment: "none",
        tags: "Strength,Recovery",
      });
    });
    expect(shownExerciseNames()).toEqual(["Cat-cow"]);
  });

  it("finds exercises by name whatever the case", async () => {
    // arrange
    const { router, user } = await renderLibrary({ exercises: LIBRARY });

    // act
    await user.type(
      screen.getByRole("searchbox", { name: "Search exercises" }),
      "SQUAT",
    );

    // assert
    await waitFor(() => {
      expect(addressOf(router)).toEqual({ q: "SQUAT" });
    });
    expect(shownExerciseNames()).toEqual(["Back squat"]);
  });

  it("finds exercises by a primary muscle and counts the tags under the search", async () => {
    // arrange
    const { user } = await renderLibrary({ exercises: LIBRARY });
    await user.type(
      screen.getByRole("searchbox", { name: "Search exercises" }),
      "glutes",
    );

    // act
    await user.click(screen.getByRole("button", { name: "Tags" }));

    // assert
    expect(shownExerciseNames()).toEqual([
      "Back squat",
      "Deadlift",
      "Hip thrust",
    ]);
    expect(
      screen.getByRole("checkbox", { name: /^Strength\s*2$/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: /^Hypertrophy\s*2$/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: /^Recovery\s*0$/ }),
    ).toBeInTheDocument();
  });

  it("restores the view the address names and drops what it does not know", async () => {
    // arrange, act
    await renderLibrary(
      { exercises: LIBRARY },
      `${COACH_TRAINING_PATH}?type=yoga&tags=Strength,Flexibility&equipment=some`,
    );

    // assert
    expect(screen.getByRole("combobox", { name: "Type" })).toHaveTextContent(
      /^Any type$/,
    );
    expect(
      screen.getByRole("combobox", { name: "Equipment" }),
    ).toHaveTextContent(/^Any equipment$/);
    expect(
      screen.getByRole("button", { name: "Tags, 1 selected" }),
    ).toBeInTheDocument();
    expect(shownExerciseNames()).toEqual(["Back squat", "Deadlift"]);
  });

  it("changes the listing without reading the library again", async () => {
    // arrange
    const { libraryReads, user } = await renderLibrary({ exercises: LIBRARY });

    // act
    await user.click(screen.getByRole("combobox", { name: "Type" }));
    await user.click(screen.getByRole("option", { name: /^Cardio \d+$/ }));

    // assert
    await waitFor(() => {
      expect(shownExerciseNames()).toEqual(["Jump rope"]);
    });
    expect(libraryReads()).toBe(1);
  });
});

describe("sorting the library", () => {
  it("sorts A to Z by name until she picks another column", async () => {
    // arrange, act
    await renderLibrary({ exercises: LIBRARY });

    // assert
    expect(sortOf("Exercise")).toBe("ascending");
    expect(sortOf("Difficulty")).toBe("none");
    expect(shownExerciseNames()).toEqual([
      "Back squat",
      "Box breathing",
      "Cat-cow",
      "Deadlift",
      "Hip thrust",
      "Jump rope",
    ]);
  });

  it("sorts by difficulty from Beginner, then by name, from the Difficulty head", async () => {
    // arrange
    const { router, user } = await renderLibrary({ exercises: LIBRARY });

    // act
    await user.click(screen.getByRole("button", { name: "Difficulty" }));

    // assert
    await waitFor(() => {
      expect(addressOf(router)).toEqual({ sort: "difficulty" });
    });
    expect(sortOf("Difficulty")).toBe("ascending");
    expect(sortOf("Exercise")).toBe("none");
    expect(shownExerciseNames()).toEqual([
      "Box breathing",
      "Cat-cow",
      "Hip thrust",
      "Back squat",
      "Jump rope",
      "Deadlift",
    ]);
  });

  it("flips the direction when she picks the sorted head again", async () => {
    // arrange
    const { router, user } = await renderLibrary(
      { exercises: LIBRARY },
      `${COACH_TRAINING_PATH}?sort=difficulty`,
    );

    // act
    await user.click(screen.getByRole("button", { name: "Difficulty" }));

    // assert
    await waitFor(() => {
      expect(addressOf(router)).toEqual({ dir: "desc", sort: "difficulty" });
    });
    expect(sortOf("Difficulty")).toBe("descending");
    expect(shownExerciseNames()).toEqual([
      "Deadlift",
      "Jump rope",
      "Back squat",
      "Hip thrust",
      "Cat-cow",
      "Box breathing",
    ]);
  });

  it("starts the other head ascending and keeps the default sort out of the address", async () => {
    // arrange
    const { router, user } = await renderLibrary(
      { exercises: LIBRARY },
      `${COACH_TRAINING_PATH}?sort=difficulty&dir=desc`,
    );

    // act
    await user.click(screen.getByRole("button", { name: "Exercise" }));

    // assert
    await waitFor(() => {
      expect(addressOf(router)).toEqual({});
    });
    expect(sortOf("Exercise")).toBe("ascending");
  });
});

describe("paging through the library", () => {
  it("shows ten exercises at a time and says which ones", async () => {
    // arrange, act
    await renderLibrary({ exercises: ELEVEN_EXERCISES });

    // assert
    expect(screen.getByText("Showing 1–10 of 11")).toBeInTheDocument();
    expect(shownExerciseNames()).toHaveLength(10);
    expect(
      screen.getByRole("navigation", { name: "pagination" }),
    ).toBeInTheDocument();
  });

  it("walks to the next page from its link", async () => {
    // arrange
    const { router, user } = await renderLibrary({
      exercises: ELEVEN_EXERCISES,
    });

    // act
    await user.click(screen.getByRole("link", { name: "Go to page 2" }));

    // assert
    await waitFor(() => {
      expect(screen.getByText("Showing 11–11 of 11")).toBeInTheDocument();
    });
    expect(shownExerciseNames()).toEqual(["Exercise 11"]);
    expect(addressOf(router)).toEqual({ page: "2" });
  });

  it("returns to the first page when she changes a filter", async () => {
    // arrange
    const { router, user } = await renderLibrary(
      { exercises: ELEVEN_EXERCISES },
      `${COACH_TRAINING_PATH}?page=2`,
    );

    // act
    await user.click(screen.getByRole("combobox", { name: "Equipment" }));
    await user.click(
      screen.getByRole("option", { name: /^No equipment \d+$/ }),
    );

    // assert
    await waitFor(() => {
      expect(addressOf(router)).toEqual({ equipment: "none" });
    });
    expect(screen.getByText("Showing 1–10 of 11")).toBeInTheDocument();
  });

  it("leaves the pager out when the library fits on one page", async () => {
    // arrange, act
    await renderLibrary({ exercises: LIBRARY });

    // assert
    expect(
      screen.queryByRole("navigation", { name: "pagination" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/^Showing/)).not.toBeInTheDocument();
  });
});

describe("a view that hides every exercise", () => {
  it("says nothing matches and Clear filters clears the filters, the search and the page but keeps the sort", async () => {
    // arrange
    const { router, user } = await renderLibrary(
      { exercises: LIBRARY },
      `${COACH_TRAINING_PATH}?type=cardio&tags=Strength&equipment=none&q=zzz&sort=difficulty&dir=desc&page=2`,
    );
    expect(screen.getByText("No exercises match")).toBeInTheDocument();
    expect(
      screen.getByText("Try another filter or search."),
    ).toBeInTheDocument();

    // act
    await user.click(screen.getByRole("button", { name: "Clear filters" }));

    // assert
    await waitFor(() => {
      expect(addressOf(router)).toEqual({ dir: "desc", sort: "difficulty" });
    });
    expect(shownExerciseNames()).toEqual([
      "Deadlift",
      "Jump rope",
      "Back squat",
      "Hip thrust",
      "Cat-cow",
      "Box breathing",
    ]);
  });
});

describe("the way back from the editor", () => {
  it("hands New exercise the library's address", async () => {
    // arrange
    const { user } = await renderLibrary(
      { exercises: LIBRARY },
      `${COACH_TRAINING_PATH}?type=resistance&sort=difficulty`,
    );

    // act
    await user.click(screen.getByRole("link", { name: "New exercise" }));

    // assert
    expect(
      await screen.findByRole("heading", { name: "Adding an exercise" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Back to ?type=resistance&sort=difficulty"),
    ).toBeInTheDocument();
  });

  it("hands Edit the library's address", async () => {
    // arrange
    const { user } = await renderLibrary(
      { exercises: ELEVEN_EXERCISES },
      `${COACH_TRAINING_PATH}?page=2`,
    );

    // act
    await user.click(
      screen.getByRole("button", { name: "Actions for Exercise 11" }),
    );
    await user.click(await screen.findByRole("menuitem", { name: "Edit" }));

    // assert
    expect(
      await screen.findByRole("heading", { name: "Editing exercise-11" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Back to ?page=2")).toBeInTheDocument();
  });
});

describe("choosing a status", () => {
  it("lists the active exercises until she picks Archived", async () => {
    // arrange, act
    await renderLibrary({ exercises: LIBRARY_WITH_ARCHIVE });

    // assert
    expect(screen.getByRole("combobox", { name: "Status" })).toHaveTextContent(
      /^Active$/,
    );
    expect(shownExerciseNames()).toEqual([
      "Back squat",
      "Box breathing",
      "Cat-cow",
      "Deadlift",
      "Hip thrust",
      "Jump rope",
    ]);
  });

  it("counts both statuses under the other filters and lists the archived ones she picks", async () => {
    // arrange
    const { router, user } = await renderLibrary(
      { exercises: LIBRARY_WITH_ARCHIVE },
      `${COACH_TRAINING_PATH}?tags=Strength`,
    );

    // act
    await user.click(screen.getByRole("combobox", { name: "Status" }));
    const offered = screen
      .getAllByRole("option")
      .map((option) => option.textContent);
    await user.click(screen.getByRole("option", { name: "Archived 1" }));

    // assert
    expect(offered).toEqual(["Active 2", "Archived 1"]);
    await waitFor(() => {
      expect(addressOf(router)).toEqual({
        status: "archived",
        tags: "Strength",
      });
    });
    expect(shownExerciseNames()).toEqual(["Walking lunge"]);
    expect(screen.getByRole("combobox", { name: "Status" })).toHaveTextContent(
      /^Archived$/,
    );
  });

  it("counts the other filters within the chosen status", async () => {
    // arrange
    const { user } = await renderLibrary(
      { exercises: LIBRARY_WITH_ARCHIVE },
      `${COACH_TRAINING_PATH}?status=archived`,
    );

    // act
    await user.click(screen.getByRole("combobox", { name: "Type" }));

    // assert
    expect(
      screen.getAllByRole("option").map((option) => option.textContent),
    ).toEqual([
      "Any type 2",
      "Resistance 1",
      "Cardio 0",
      "Mobility 1",
      "Stretching 0",
      "Breathing 0",
    ]);
  });

  it("keeps Active out of the address", async () => {
    // arrange
    const { router, user } = await renderLibrary(
      { exercises: LIBRARY_WITH_ARCHIVE },
      `${COACH_TRAINING_PATH}?status=archived`,
    );

    // act
    await user.click(screen.getByRole("combobox", { name: "Status" }));
    await user.click(screen.getByRole("option", { name: /^Active \d+$/ }));

    // assert
    await waitFor(() => {
      expect(addressOf(router)).toEqual({});
    });
    expect(shownExerciseNames()).toHaveLength(LIBRARY.length);
  });

  it("returns to the first page when she changes the status", async () => {
    // arrange
    const { router, user } = await renderLibrary(
      { exercises: [...ELEVEN_EXERCISES, WALKING_LUNGE] },
      `${COACH_TRAINING_PATH}?page=2`,
    );

    // act
    await user.click(screen.getByRole("combobox", { name: "Status" }));
    await user.click(screen.getByRole("option", { name: "Archived 1" }));

    // assert
    await waitFor(() => {
      expect(addressOf(router)).toEqual({ status: "archived" });
    });
    expect(shownExerciseNames()).toEqual(["Walking lunge"]);
  });

  it("keeps the status when she clears the filters", async () => {
    // arrange
    const { router, user } = await renderLibrary(
      { exercises: LIBRARY_WITH_ARCHIVE },
      `${COACH_TRAINING_PATH}?status=archived&type=cardio`,
    );
    expect(screen.getByText("No exercises match")).toBeInTheDocument();

    // act
    await user.click(screen.getByRole("button", { name: "Clear filters" }));

    // assert
    await waitFor(() => {
      expect(addressOf(router)).toEqual({ status: "archived" });
    });
    expect(shownExerciseNames()).toEqual(["Side plank", "Walking lunge"]);
  });

  it("says nothing is archived yet, with nothing to clear", async () => {
    // arrange, act
    await renderLibrary(
      { exercises: LIBRARY },
      `${COACH_TRAINING_PATH}?status=archived&q=squat`,
    );

    // assert
    expect(screen.getByText("No archived exercises")).toBeInTheDocument();
    expect(
      screen.getByText("Exercises you archive appear here, ready to restore."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Clear filters" }),
    ).not.toBeInTheDocument();
  });
});

describe("archiving and restoring", () => {
  it("archives an exercise at once, says so and moves focus to the page heading", async () => {
    // arrange
    const { sent, user } = await renderLibrary({ exercises: LIBRARY });

    // act
    await chooseRowAction(user, "Back squat", "Archive");

    // assert
    expect(
      await screen.findByText('"Back squat" archived'),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(shownExerciseNames()).not.toContain("Back squat");
    });
    await waitFor(() => {
      expect(pageHeading()).toHaveFocus();
    });
    expect(sent).toEqual([
      `POST /api/coach/exercises/${BACK_SQUAT.id}/archive`,
    ]);
  });

  it("restores an archived exercise at once and says so", async () => {
    // arrange
    const { sent, user } = await renderLibrary(
      { exercises: LIBRARY_WITH_ARCHIVE },
      `${COACH_TRAINING_PATH}?status=archived`,
    );

    // act
    await chooseRowAction(user, "Walking lunge", "Restore");

    // assert
    expect(
      await screen.findByText('"Walking lunge" restored'),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(shownExerciseNames()).toEqual(["Side plank"]);
    });
    await waitFor(() => {
      expect(pageHeading()).toHaveFocus();
    });
    expect(sent).toEqual([
      `POST /api/coach/exercises/${WALKING_LUNGE.id}/restore`,
    ]);
  });

  it("names the new name when a restore had to rename the exercise", async () => {
    // arrange
    const { user } = await renderLibrary(
      { exercises: LIBRARY_WITH_ARCHIVE },
      `${COACH_TRAINING_PATH}?status=archived`,
    );
    server.use(
      http.post(`*${EXERCISE_LIBRARY_API_PATHS.exerciseRestore}`, () =>
        HttpResponse.json({ name: "Walking lunge (2)" }),
      ),
    );

    // act
    await chooseRowAction(user, "Walking lunge", "Restore");

    // assert
    expect(
      await screen.findByText(
        '"Walking lunge" restored as "Walking lunge (2)"',
      ),
    ).toBeInTheDocument();
  });

  it("tells her and keeps the list as it was when an archive fails", async () => {
    // arrange
    const { user } = await renderLibrary({ exercises: LIBRARY });
    server.use(
      http.post(
        `*${EXERCISE_LIBRARY_API_PATHS.exerciseArchive}`,
        () => new HttpResponse("Internal Server Error", { status: 500 }),
      ),
    );

    // act
    await chooseRowAction(user, "Back squat", "Archive");

    // assert
    expect(
      await screen.findByText('"Back squat" wasn’t archived. Try again.'),
    ).toBeInTheDocument();
    expect(shownExerciseNames()).toContain("Back squat");
    expect(screen.queryByText('"Back squat" archived')).not.toBeInTheDocument();
  });
});

describe("deleting an exercise", () => {
  it("asks first, naming the exercise and saying it is for good", async () => {
    // arrange
    const { user } = await renderLibrary({ exercises: LIBRARY });

    // act
    const confirm = await openDeleteConfirm(user, "Back squat");

    // assert
    expect(confirm).toHaveAccessibleDescription(
      "It’s removed for good. This can’t be undone.",
    );
    expect(
      within(confirm).getByRole("button", { name: "Delete" }),
    ).toBeVisible();
    expect(
      within(confirm).getByRole("button", { name: "Cancel" }),
    ).toBeVisible();
  });

  it("keeps the exercise and returns focus to its menu button when she cancels", async () => {
    // arrange
    const { sent, user } = await renderLibrary({ exercises: LIBRARY });
    const confirm = await openDeleteConfirm(user, "Back squat");

    // act
    await user.click(within(confirm).getByRole("button", { name: "Cancel" }));

    // assert
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: "Actions for Back squat" }),
    ).toHaveFocus();
    expect(shownExerciseNames()).toContain("Back squat");
    expect(sent).toEqual([]);
  });

  it("deletes the exercise, says so and moves focus to the page heading when she confirms", async () => {
    // arrange
    const { sent, user } = await renderLibrary({ exercises: LIBRARY });
    const confirm = await openDeleteConfirm(user, "Back squat");

    // act
    await user.click(within(confirm).getByRole("button", { name: "Delete" }));

    // assert
    expect(await screen.findByText('"Back squat" deleted')).toBeInTheDocument();
    await waitFor(() => {
      expect(shownExerciseNames()).not.toContain("Back squat");
    });
    await waitFor(() => {
      expect(pageHeading()).toHaveFocus();
    });
    expect(sent).toEqual([`DELETE /api/coach/exercises/${BACK_SQUAT.id}`]);
  });

  it("deletes an archived exercise from the archived list", async () => {
    // arrange
    const { sent, user } = await renderLibrary(
      { exercises: LIBRARY_WITH_ARCHIVE },
      `${COACH_TRAINING_PATH}?status=archived`,
    );
    const confirm = await openDeleteConfirm(user, "Side plank");

    // act
    await user.click(within(confirm).getByRole("button", { name: "Delete" }));

    // assert
    expect(await screen.findByText('"Side plank" deleted')).toBeInTheDocument();
    await waitFor(() => {
      expect(shownExerciseNames()).toEqual(["Walking lunge"]);
    });
    expect(sent).toEqual([`DELETE /api/coach/exercises/${SIDE_PLANK.id}`]);
  });

  it("tells her and keeps the exercise when the delete never reaches the server", async () => {
    // arrange
    const { user } = await renderLibrary({ exercises: LIBRARY });
    server.use(
      http.delete(`*${EXERCISE_LIBRARY_API_PATHS.exercise}`, () =>
        HttpResponse.error(),
      ),
    );
    const confirm = await openDeleteConfirm(user, "Back squat");

    // act
    await user.click(within(confirm).getByRole("button", { name: "Delete" }));

    // assert
    expect(
      await screen.findByText('"Back squat" wasn’t deleted. Try again.'),
    ).toBeInTheDocument();
    expect(shownExerciseNames()).toContain("Back squat");
  });
});

function EditorStandIn() {
  const { exerciseId } = useParams();

  return (
    <>
      <h1>{`Editing ${exerciseId}`}</h1>
      <LibraryAddressCarried />
    </>
  );
}

function NewExerciseStandIn() {
  return (
    <>
      <h1>Adding an exercise</h1>
      <LibraryAddressCarried />
    </>
  );
}

function LibraryAddressCarried() {
  const { state } = useLocation();

  return <p>{`Back to ${(state as { library?: string } | null)?.library}`}</p>;
}

function rowTexts(): string[][] {
  const [, ...rows] = screen.getAllByRole("row");

  return rows.map((row) =>
    within(row)
      .getAllByRole("cell")
      .map((cell) => cell.textContent ?? ""),
  );
}

function shownExerciseNames(): string[] {
  return screen
    .queryAllByRole("button", { name: /^Actions for / })
    .map((button) =>
      (button.getAttribute("aria-label") ?? "").replace(/^Actions for /, ""),
    );
}

function sortOf(column: string): string | null {
  return screen
    .getByRole("columnheader", { name: column })
    .getAttribute("aria-sort");
}

function addressOf(router: LibraryRouter): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(router.state.location.search));
}

type LibraryRouter = ReturnType<typeof createMemoryRouter>;

type LibraryStore = {
  load: () => ExerciseLibraryView;
  replace: (exercise: ExerciseView) => void;
  remove: (exerciseId: string) => void;
};

function libraryStore(library: ExerciseLibraryView): LibraryStore {
  let exercises = [...library.exercises];

  return {
    load: () => ({ exercises }),
    replace: (exercise) => {
      exercises = exercises.map((listed) =>
        listed.id === exercise.id ? exercise : listed,
      );
    },
    remove: (exerciseId) => {
      exercises = exercises.filter(({ id }) => id !== exerciseId);
    },
  };
}

function exerciseIn(store: LibraryStore, exerciseId: unknown): ExerciseView {
  const found = store
    .load()
    .exercises.find(({ id }) => id === String(exerciseId));

  if (!found) {
    throw new Error(`No exercise ${String(exerciseId)} in the library.`);
  }

  return found;
}

function acceptLifecycleWrites(store: LibraryStore): string[] {
  const sent: string[] = [];
  const record = (request: Request) =>
    sent.push(`${request.method} ${new URL(request.url).pathname}`);

  server.use(
    http.post(
      `*${EXERCISE_LIBRARY_API_PATHS.exerciseArchive}`,
      ({ params, request }) => {
        record(request);
        const exercise = exerciseIn(store, params.exerciseId);
        store.replace({ ...exercise, status: "archived" });

        return HttpResponse.json({ name: exercise.name });
      },
    ),
    http.post(
      `*${EXERCISE_LIBRARY_API_PATHS.exerciseRestore}`,
      ({ params, request }) => {
        record(request);
        const exercise = exerciseIn(store, params.exerciseId);
        store.replace({ ...exercise, status: "active" });

        return HttpResponse.json({ name: exercise.name });
      },
    ),
    http.delete(
      `*${EXERCISE_LIBRARY_API_PATHS.exercise}`,
      ({ params, request }) => {
        record(request);
        const exercise = exerciseIn(store, params.exerciseId);
        store.remove(exercise.id);

        return HttpResponse.json({ name: exercise.name });
      },
    ),
  );

  return sent;
}

async function chooseRowAction(user: UserEvent, name: string, action: string) {
  await user.click(screen.getByRole("button", { name: `Actions for ${name}` }));
  await user.click(await screen.findByRole("menuitem", { name: action }));
}

async function openDeleteConfirm(user: UserEvent, name: string) {
  await chooseRowAction(user, name, "Delete");

  return screen.findByRole("dialog", { name: `Delete “${name}”?` });
}

function pageHeading(): HTMLElement {
  return screen.getByRole("heading", { level: 1, name: HEADING });
}

async function renderLibrary(
  library: ExerciseLibraryView,
  entry: string = COACH_TRAINING_PATH,
): Promise<{
  libraryReads: () => number;
  router: LibraryRouter;
  sent: string[];
  user: UserEvent;
}> {
  const user = userEvent.setup();
  const store = libraryStore(library);
  const sent = acceptLifecycleWrites(store);
  const loader = vi.fn(() => store.load());
  const router = createMemoryRouter(
    [
      {
        Component: ExerciseLibraryRoute,
        loader,
        path: COACH_TRAINING_PATH,
        shouldRevalidate,
      },
      {
        Component: NewExerciseStandIn,
        path: NEW_EXERCISE_PATH,
      },
      {
        Component: EditorStandIn,
        path: `/coach/${EXERCISE_EDITOR_ROUTE_SEGMENT}`,
      },
      {
        action: frameworkModeAction(removeExercise),
        path: EXERCISE_LIBRARY_API_PATHS.exercise,
      },
      {
        action: frameworkModeAction(archiveExercise),
        path: EXERCISE_LIBRARY_API_PATHS.exerciseArchive,
      },
      {
        action: frameworkModeAction(restoreExercise),
        path: EXERCISE_LIBRARY_API_PATHS.exerciseRestore,
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
  await screen.findByRole("heading", { level: 1, name: HEADING });

  return {
    libraryReads: () => loader.mock.calls.length,
    router,
    sent,
    user,
  };
}
