// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { Toaster } from "@eli-coach-platform/ui/toast";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
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
  exerciseVideoPath,
  NEW_EXERCISE_PATH,
} from "~/features/exercise-library/public/paths";
import { frameworkModeAction } from "~/server/test-support/framework-mode-action";

import ExerciseEditorRoute from "./exercise-editor-page";
import ExerciseLibraryRoute from "./exercise-library-page";

const HIP_THRUST_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const HIP_THRUST_VIDEO_PATH = exerciseVideoPath(
  HIP_THRUST_ID,
  "7c6b5a49-3827-4161-a5b4-c3d2e1f0a9b8",
);

const HIP_THRUST: ExerciseView = {
  id: HIP_THRUST_ID,
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
  video: { path: HIP_THRUST_VIDEO_PATH, format: "mp4" },
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
  video: null,
};

const LIBRARY = [BREATH_HOLD, HIP_THRUST];
const UNKNOWN_ID = "9e8d7c6b-5a49-4382-9716-a5b4c3d2e1f0";
const SAVE_FAILED = "We couldn't save the exercise. Try again in a moment.";
const VIDEO_PROMPT = "Drop a video here or choose one";
const VIDEO_GUIDANCE =
  "MP4 or MOV up to 50 MB, in a format that plays well on a phone.";
const UPLOAD_FAILED =
  "The upload didn’t go through. Your entries are still here.";
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const VIDEO_BYTES = "squat-demo-bytes";

class HeldUploadRequest extends EventTarget {
  static sent: HeldUploadRequest[] = [];
  static whenSent: () => void = () => {};

  readonly upload = new EventTarget();
  status = 0;
  responseText = "";
  aborted = false;

  open() {}

  setRequestHeader() {}

  getResponseHeader(name: string): string | null {
    return name.toLowerCase() === "content-type" ? "application/json" : null;
  }

  send() {
    HeldUploadRequest.sent.push(this);
    HeldUploadRequest.whenSent();
  }

  abort() {
    this.aborted = true;
  }

  reportBytesSent(fraction: number) {
    this.upload.dispatchEvent(
      Object.assign(new Event("progress"), {
        lengthComputable: true,
        loaded: fraction * 100,
        total: 100,
      }),
    );
  }

  finishSending() {
    this.upload.dispatchEvent(new Event("load"));
  }
}

const server = setupServer();

let sentBodies: { method: string; path: string; body: unknown }[] = [];

let interceptedXhr = globalThis.XMLHttpRequest;

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
  interceptedXhr = globalThis.XMLHttpRequest;
  URL.createObjectURL = vi.fn((file: Blob) => `blob:${(file as File).name}`);
  URL.revokeObjectURL = vi.fn();
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
  HeldUploadRequest.sent = [];
  HeldUploadRequest.whenSent = () => {};
  vi.mocked(URL.revokeObjectURL).mockClear();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  vi.stubGlobal("XMLHttpRequest", interceptedXhr);
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
    expect(
      screen.getByRole("textbox", { name: "Name (required)" }),
    ).toHaveValue("");
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
      screen.getByRole("button", { name: "Primary muscles (required)" }),
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
    await user.type(
      screen.getByRole("textbox", { name: "Name (required)" }),
      "B",
    );

    // assert
    expect(screen.queryByText("Give the exercise a name")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Primary muscles (required)" }),
    ).toHaveAccessibleDescription("Pick at least one primary muscle");
    expect(
      screen.getByRole("button", { name: "Primary muscles (required)" }),
    ).toHaveAttribute("aria-invalid", "true");

    // act
    await user.clear(screen.getByRole("textbox", { name: "Name (required)" }));

    // assert
    expect(
      screen.getByRole("textbox", { name: "Name (required)" }),
    ).toHaveAccessibleDescription("Give the exercise a name");
    expect(
      screen.getByRole("textbox", { name: "Name (required)" }),
    ).toHaveAttribute("aria-invalid", "true");
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
      await pickMuscles(user, "Primary muscles (required)", ["Glutes"]);

      // act
      await enter(user, "Name (required)", entered);

      // assert
      expect(
        screen.getByRole("textbox", { name: "Name (required)" }),
      ).toHaveAccessibleDescription(problem);
      expect(
        screen.getByRole("button", { name: "Create exercise" }),
      ).toBeDisabled();
    },
  );

  it("counts the name's length after trimming the spaces around it", async () => {
    // arrange
    const user = await renderEditor(NEW_EXERCISE_PATH);
    await pickMuscles(user, "Primary muscles (required)", ["Glutes"]);

    // act
    await enter(user, "Name (required)", `  ${"n".repeat(80)}  `);

    // assert
    expect(
      screen.getByRole("textbox", { name: "Name (required)" }),
    ).not.toHaveAttribute("aria-invalid");
    expect(
      screen.getByRole("button", { name: "Create exercise" }),
    ).toBeEnabled();
  });

  it("refuses form cues over 1,000 characters and keeps everything she typed", async () => {
    // arrange
    const user = await renderEditor(NEW_EXERCISE_PATH);
    await enter(user, "Name (required)", "Glute bridge");
    await pickMuscles(user, "Primary muscles (required)", ["Glutes"]);

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

  it("stars Name and Primary muscles as mandatory", async () => {
    // arrange, act
    await renderEditor(NEW_EXERCISE_PATH);

    // assert
    expect(
      screen.getByRole("textbox", { name: "Name (required)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Primary muscles", { selector: "label" }),
    ).toHaveTextContent("Primary muscles* (required)");
    expect(screen.getAllByText("*")).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: "Primary muscles (required)" }),
    ).toBeInTheDocument();
  });

  it("drops the star from Primary muscles on a cardio exercise", async () => {
    // arrange
    const user = await renderEditor(NEW_EXERCISE_PATH);

    // act
    await choose(user, "Type", "Cardio");

    // assert
    expect(
      screen.getByText("Primary muscles", { selector: "label" }),
    ).toHaveTextContent(/^Primary muscles$/);
    expect(screen.getAllByText("*")).toHaveLength(1);
    expect(
      screen.getByRole("button", { name: "Primary muscles" }),
    ).toBeInTheDocument();
  });

  it("asks for no primary muscle on a cardio exercise", async () => {
    // arrange
    const user = await renderEditor(NEW_EXERCISE_PATH);
    await enter(user, "Name (required)", "Easy run");

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
    await enter(user, "Name (required)", "  Glute bridge ");
    await choose(user, "Measured in", /^Time/);
    await user.click(screen.getByRole("radio", { name: "One side at a time" }));
    await pickMuscles(user, "Primary muscles (required)", ["Glutes"]);
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
          video: "keep",
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
    await enter(user, "Name (required)", "Glute bridge");
    await pickMuscles(user, "Primary muscles (required)", ["Glutes"]);

    // act
    await user.click(screen.getByRole("button", { name: "Create exercise" }));

    // assert
    const name = screen.getByRole("textbox", { name: "Name (required)" });
    expect(
      await screen.findByText("An exercise with this name already exists"),
    ).toBeInTheDocument();
    expect(name).toHaveAccessibleDescription(
      "An exercise with this name already exists",
    );
    expect(name).toHaveValue("Glute bridge");
    expect(
      screen.getByRole("button", {
        name: "Primary muscles (required), 1 selected",
      }),
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
    await enter(user, "Name (required)", "Single-leg glute bridge");

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
    await enter(user, "Name (required)", "Glute bridge");
    await pickMuscles(user, "Primary muscles (required)", ["Glutes"]);

    // act
    await user.click(screen.getByRole("button", { name: "Create exercise" }));

    // assert
    expect(await screen.findByText(SAVE_FAILED)).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Name (required)" }),
    ).toHaveValue("Glute bridge");
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
    await pickMuscles(user, "Primary muscles (required), 1 selected", [
      "Hamstrings",
    ]);

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
    expect(
      screen.getByRole("textbox", { name: "Name (required)" }),
    ).toHaveValue("Breath hold");
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
      screen.getByRole("button", {
        name: "Primary muscles (required), 1 selected",
      }),
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
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Save changes" }),
      ).toBeEnabled(),
    );
  });

  it("keeps its own name free while flagging another exercise's", async () => {
    // arrange
    const user = await renderEditor(exerciseEditorPath(BREATH_HOLD.id));

    // act
    await enter(user, "Name (required)", "BREATH HOLD");

    // assert
    expect(
      screen.getByRole("textbox", { name: "Name (required)" }),
    ).not.toHaveAttribute("aria-invalid");

    // act
    await enter(user, "Name (required)", "Hip thrust");

    // assert
    expect(
      screen.getByRole("textbox", { name: "Name (required)" }),
    ).toHaveAccessibleDescription("An exercise with this name already exists");
  });

  it("saves the whole exercise and returns to the library with a confirmation", async () => {
    // arrange
    acceptSaves();
    const user = await renderEditor(exerciseEditorPath(BREATH_HOLD.id));
    await enter(user, "Name (required)", "Long breath hold");

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
          video: "keep",
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
      await enter(user, "Name (required)", "Long breath hold");

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

describe("the demo video", () => {
  it("offers a drop zone named by its prompt that takes an .mp4 or a .mov and says what to upload", async () => {
    // arrange, act
    await renderEditor(NEW_EXERCISE_PATH);

    // assert
    const picker = within(videoField()).getByLabelText(VIDEO_PROMPT);
    expect(picker).toHaveAttribute("type", "file");
    expect(picker).toHaveAttribute(
      "accept",
      ".mp4,.mov,video/mp4,video/quicktime",
    );
    expect(picker).toHaveAccessibleDescription(VIDEO_GUIDANCE);
  });

  it("previews a chosen video at once with play controls, Remove inside its frame and Replace beside it", async () => {
    // arrange
    const user = await renderEditor(NEW_EXERCISE_PATH);

    // act
    await user.upload(
      screen.getByLabelText(VIDEO_PROMPT),
      videoNamed("squat.mp4"),
    );

    // assert
    const shown = preview();
    expect(shown).toHaveAttribute("src", "blob:squat.mp4");
    expect(shown).toHaveAttribute("controls");
    expect(shown).toHaveAttribute("preload", "metadata");
    const frame = shown.parentElement as HTMLElement;
    expect(frame).toContainElement(removeButton());
    expect(frame).not.toContainElement(replaceButton());
    expect(removeButton()).toBeEnabled();
    expect(replaceButton()).toBeEnabled();
    expect(screen.queryByLabelText(VIDEO_PROMPT)).not.toBeInTheDocument();
  });

  it("refuses a dropped file that is not an .mp4 or a .mov on the spot, naming it on the drop zone", async () => {
    // arrange
    await renderEditor(NEW_EXERCISE_PATH);

    // act
    dropVideo(new File(["avi"], "squat.avi", { type: "video/x-msvideo" }));

    // assert
    const message =
      "squat.avi is not an .mp4 or .mov — only .mp4 and .mov videos are supported";
    expect(within(videoField()).getByRole("alert")).toHaveTextContent(message);
    const picker = screen.getByLabelText(VIDEO_PROMPT);
    expect(picker).toHaveAttribute("aria-invalid", "true");
    expect(picker).toHaveAccessibleDescription(`${VIDEO_GUIDANCE} ${message}`);
  });

  it("takes a dropped .mov whose media type the browser left empty", async () => {
    // arrange
    await renderEditor(NEW_EXERCISE_PATH);

    // act
    dropVideo(new File(["mov"], "squat.MOV"));

    // assert
    expect(preview()).toHaveAttribute("src", "blob:squat.MOV");
    expect(within(videoField()).getByRole("alert")).toBeEmptyDOMElement();
  });

  it("refuses an .mp4 over 50 MB that would replace the chosen video and keeps the chosen one", async () => {
    // arrange
    const user = await renderEditor(NEW_EXERCISE_PATH);
    await user.upload(
      screen.getByLabelText(VIDEO_PROMPT),
      videoNamed("squat.mp4"),
    );

    // act
    replaceWith(videoNamed("squat-long.mp4", MAX_VIDEO_BYTES + 1));

    // assert
    expect(within(videoField()).getByRole("alert")).toHaveTextContent(
      "squat-long.mp4 is larger than 50 MB",
    );
    expect(preview()).toHaveAttribute("src", "blob:squat.mp4");
    expect(replaceButton()).toHaveAttribute("aria-invalid", "true");
    expect(replaceButton()).toHaveAccessibleDescription(
      "squat-long.mp4 is larger than 50 MB",
    );
  });

  it("keeps the stored video when a replacement is not an .mp4 or a .mov", async () => {
    // arrange
    await renderEditor(exerciseEditorPath(HIP_THRUST.id));

    // act
    replaceWith(new File(["avi"], "thrust.avi", { type: "video/x-msvideo" }));

    // assert
    expect(within(videoField()).getByRole("alert")).toHaveTextContent(
      "thrust.avi is not an .mp4 or .mov — only .mp4 and .mov videos are supported",
    );
    expect(preview()).toHaveAttribute("src", HIP_THRUST_VIDEO_PATH);
  });

  it("clears the refusal once she chooses a video it takes", async () => {
    // arrange
    await renderEditor(NEW_EXERCISE_PATH);
    dropVideo(new File(["avi"], "squat.avi", { type: "video/x-msvideo" }));

    // act
    dropVideo(videoNamed("squat.mp4"));

    // assert
    expect(within(videoField()).getByRole("alert")).toBeEmptyDOMElement();
    expect(replaceButton()).not.toHaveAttribute("aria-invalid");
  });

  it("plays an exercise's stored video from the server with the player controls", async () => {
    // arrange, act
    await renderEditor(exerciseEditorPath(HIP_THRUST.id));

    // assert
    expect(preview()).toHaveAttribute("src", HIP_THRUST_VIDEO_PATH);
    expect(preview()).toHaveAttribute("controls");
    expect(preview()).toHaveAttribute("preload", "metadata");
  });

  it("lets go of each preview it made once she replaces or removes the video", async () => {
    // arrange
    const user = await renderEditor(NEW_EXERCISE_PATH);
    await user.upload(
      screen.getByLabelText(VIDEO_PROMPT),
      videoNamed("first.mp4"),
    );

    // act
    replaceWith(videoNamed("second.mp4"));

    // assert
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:first.mp4");

    // act
    await user.click(removeButton());

    // assert
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:second.mp4");
    expect(screen.getByLabelText(VIDEO_PROMPT)).toBeInTheDocument();
  });
});

describe("saving with a demo video", () => {
  it("sends the exercise and the chosen file in one request and returns to the library", async () => {
    // arrange
    acceptSaves();
    const user = await renderEditor(NEW_EXERCISE_PATH);
    await enter(user, "Name (required)", "Glute bridge");
    await pickMuscles(user, "Primary muscles (required)", ["Glutes"]);
    await user.upload(
      screen.getByLabelText(VIDEO_PROMPT),
      videoNamed("bridge.mp4"),
    );

    // act
    await user.click(screen.getByRole("button", { name: "Create exercise" }));

    // assert
    expect(await screen.findByText("Exercise created")).toBeInTheDocument();
    expect(sentBodies).toEqual([
      {
        method: "POST",
        path: EXERCISE_LIBRARY_API_PATHS.exercises,
        body: {
          exercise: {
            name: "Glute bridge",
            type: "resistance",
            unit: "reps",
            perSide: false,
            primaryMuscles: ["Glutes"],
            secondaryMuscles: [],
            equipment: [],
            difficulty: "Beginner",
            tags: [],
            cues: "",
            video: "attach",
          },
          video: VIDEO_BYTES,
        },
      },
    ]);
  });

  it("shows how much of the video has been sent and locks Save, Replace and Remove", async () => {
    // arrange
    vi.stubGlobal("XMLHttpRequest", HeldUploadRequest);
    const user = await renderEditorReadyToSave(
      exerciseEditorPath(HIP_THRUST.id),
    );
    replaceWith(videoNamed("thrust.mp4"));
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    const upload = await heldUpload();

    // act
    upload.reportBytesSent(0.4);

    // assert
    expect(
      await within(videoField()).findByText("Uploading video… 40%"),
    ).toBeInTheDocument();
    expect(within(videoField()).getByRole("status")).toHaveTextContent(
      "Uploading video… 40%",
    );
    expect(
      screen.getByRole("progressbar", { name: "Video upload" }),
    ).toHaveAttribute("aria-valuenow", "40");
    const saving = screen.getByRole("button", { name: "Saving…" });
    expect(saving).toBeDisabled();
    expect(saving).toHaveAttribute("aria-busy", "true");
    expect(saving.querySelector("svg")).toBeNull();
    expect(replaceButton()).toBeDisabled();
    expect(removeButton()).toBeDisabled();
  });

  it("says it is finishing up once every byte is sent and the server is storing it", async () => {
    // arrange
    vi.stubGlobal("XMLHttpRequest", HeldUploadRequest);
    const user = await renderEditorReadyToSave(
      exerciseEditorPath(HIP_THRUST.id),
    );
    replaceWith(videoNamed("thrust.mp4"));
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    const upload = await heldUpload();

    // act
    upload.finishSending();

    // assert
    expect(
      await within(videoField()).findByText("Finishing up…"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "Video upload" }),
    ).not.toHaveAttribute("aria-valuenow");
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
    expect(replaceButton()).toBeDisabled();
  });

  it("keeps the one upload going when she submits again before Save shows it is busy", async () => {
    // arrange
    vi.stubGlobal("XMLHttpRequest", HeldUploadRequest);
    const user = await renderEditorReadyToSave(
      exerciseEditorPath(HIP_THRUST.id),
    );
    replaceWith(videoNamed("thrust.mp4"));
    const form = screen
      .getByRole("textbox", { name: "Name (required)" })
      .closest("form") as HTMLFormElement;
    HeldUploadRequest.whenSent = () => {
      HeldUploadRequest.whenSent = () => {};
      fireEvent.submit(form);
    };

    // act
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    const upload = await heldUpload();
    upload.reportBytesSent(0.4);

    // assert
    expect(
      await within(videoField()).findByText("Uploading video… 40%"),
    ).toBeInTheDocument();
    expect(upload.aborted).toBe(false);
    expect(HeldUploadRequest.sent).toHaveLength(1);
  });

  it("keeps every entry and the file when the upload does not go through, and Try again sends it again", async () => {
    // arrange
    let attempts = 0;
    server.use(
      http.put(`*${EXERCISE_LIBRARY_API_PATHS.exercises}/:exerciseId`, () => {
        attempts += 1;

        return attempts === 1
          ? new HttpResponse("Internal Server Error", { status: 500 })
          : HttpResponse.json({ redirectTo: COACH_TRAINING_PATH });
      }),
    );
    const user = await renderEditorReadyToSave(
      exerciseEditorPath(HIP_THRUST.id),
    );
    await enter(user, "Name (required)", "Banded hip thrust");
    replaceWith(videoNamed("thrust.mp4"));

    // act
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    // assert
    const failure = await within(videoField()).findByText(UPLOAD_FAILED);
    expect(failure.closest("[role=alert]")).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Name (required)" }),
    ).toHaveValue("Banded hip thrust");
    expect(preview()).toHaveAttribute("src", "blob:thrust.mp4");
    expect(within(videoField()).getByRole("status")).toBeEmptyDOMElement();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();
    expect(screen.queryByText(SAVE_FAILED)).not.toBeInTheDocument();

    // act
    await user.click(
      within(videoField()).getByRole("button", { name: "Try again" }),
    );

    // assert
    expect(await screen.findByText("Exercise updated")).toBeInTheDocument();
    expect(attempts).toBe(2);
  });

  it.each([
    {
      httpStatus: 422,
      problem: "unsupported",
      message: "thrust.mp4 doesn’t contain an MP4 or MOV video.",
    },
    {
      httpStatus: 413,
      problem: "too-large",
      message: "thrust.mp4 is larger than 50 MB",
    },
  ])(
    "shows the server refusing the file as $problem on the field, naming it, and keeps the file and every entry",
    async ({ httpStatus, problem, message }) => {
      // arrange
      server.use(
        http.put(`*${EXERCISE_LIBRARY_API_PATHS.exercises}/:exerciseId`, () =>
          HttpResponse.json(
            { problems: { video: problem } },
            { status: httpStatus },
          ),
        ),
      );
      const user = await renderEditorReadyToSave(
        exerciseEditorPath(HIP_THRUST.id),
      );
      await enter(user, "Name (required)", "Banded hip thrust");
      replaceWith(videoNamed("thrust.mp4"));

      // act
      await user.click(screen.getByRole("button", { name: "Save changes" }));

      // assert
      expect(await within(videoField()).findByText(message)).toHaveAttribute(
        "role",
        "alert",
      );
      expect(replaceButton()).toHaveAttribute("aria-invalid", "true");
      expect(replaceButton()).toHaveAccessibleDescription(message);
      expect(preview()).toHaveAttribute("src", "blob:thrust.mp4");
      expect(
        screen.getByRole("textbox", { name: "Name (required)" }),
      ).toHaveValue("Banded hip thrust");
      expect(
        within(videoField()).queryByRole("button", { name: "Try again" }),
      ).not.toBeInTheDocument();
      expect(screen.queryByText(SAVE_FAILED)).not.toBeInTheDocument();
    },
  );

  it("leaves the exercise without a video when she removes the stored one and saves", async () => {
    // arrange
    acceptSaves();
    const user = await renderEditorReadyToSave(
      exerciseEditorPath(HIP_THRUST.id),
    );

    // act
    await user.click(removeButton());
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    // assert
    expect(await screen.findByText("Exercise updated")).toBeInTheDocument();
    expect(sentBodies).toEqual([
      {
        method: "PUT",
        path: `${EXERCISE_LIBRARY_API_PATHS.exercises}/${HIP_THRUST.id}`,
        body: expect.objectContaining({ name: "Hip thrust", video: "remove" }),
      },
    ]);
  });

  it("sends the new file in place of the stored one when she replaces it and saves", async () => {
    // arrange
    acceptSaves();
    const user = await renderEditorReadyToSave(
      exerciseEditorPath(HIP_THRUST.id),
    );

    // act
    replaceWith(
      videoNamed("thrust.mov", VIDEO_BYTES.length, "video/quicktime"),
    );
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    // assert
    expect(await screen.findByText("Exercise updated")).toBeInTheDocument();
    expect(sentBodies).toEqual([
      {
        method: "PUT",
        path: `${EXERCISE_LIBRARY_API_PATHS.exercises}/${HIP_THRUST.id}`,
        body: {
          exercise: expect.objectContaining({
            name: "Hip thrust",
            video: "attach",
          }),
          video: VIDEO_BYTES,
        },
      },
    ]);
  });

  it("stays a plain save with no upload progress when no new file was chosen", async () => {
    // arrange
    vi.stubGlobal("XMLHttpRequest", HeldUploadRequest);
    const user = await renderEditorReadyToSave(
      exerciseEditorPath(HIP_THRUST.id),
    );

    // act
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    const upload = await heldUpload();
    upload.reportBytesSent(0.4);

    // assert
    const save = screen.getByRole("button", { name: "Save changes" });
    await waitFor(() => expect(save).toHaveAttribute("aria-busy", "true"));
    expect(save).toBeDisabled();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(within(videoField()).getByRole("status")).toBeEmptyDOMElement();
  });
});

function acceptSaves() {
  const record = async ({ request }: { request: Request }) => {
    sentBodies.push({
      method: request.method,
      path: new URL(request.url).pathname,
      body: await sentBodyOf(request),
    });

    return HttpResponse.json({ redirectTo: COACH_TRAINING_PATH });
  };

  server.use(
    http.post(`*${EXERCISE_LIBRARY_API_PATHS.exercises}`, record),
    http.put(`*${EXERCISE_LIBRARY_API_PATHS.exercises}/:exerciseId`, record),
  );
}

async function sentBodyOf(request: Request): Promise<unknown> {
  const contentType = request.headers.get("Content-Type") ?? "";
  if (!contentType.startsWith("multipart/form-data")) {
    return request.json();
  }

  const body = await request.text();

  return {
    exercise: JSON.parse(partOf(body, "exercise")),
    video: partOf(body, "video"),
  };
}

function partOf(body: string, name: string): string {
  const match = new RegExp(
    `name="${name}"(?:; filename="[^"]*")?\\r\\n(?:Content-Type: [^\\r]*\\r\\n)?\\r\\n([^\\r]*)`,
  ).exec(body);

  return match?.[1] ?? "";
}

function videoNamed(
  name: string,
  size = VIDEO_BYTES.length,
  type = "video/mp4",
): File {
  const file = new File([VIDEO_BYTES], name, { type });
  Object.defineProperty(file, "size", { value: size });

  return file;
}

function videoField(): HTMLElement {
  return screen.getByRole("group", { name: "Demo video" });
}

function preview(): HTMLElement {
  return within(videoField()).getByLabelText("Demo video preview");
}

function removeButton(): HTMLElement {
  return within(videoField()).getByRole("button", { name: "Remove video" });
}

function replaceButton(): HTMLElement {
  return within(videoField()).getByRole("button", { name: "Replace video" });
}

function dropVideo(file: File) {
  const zone = screen.getByText(VIDEO_PROMPT).closest("label");
  fireEvent.drop(zone as HTMLElement, { dataTransfer: { files: [file] } });
}

function replaceWith(file: File) {
  const input = videoField().querySelector('input[type="file"]');
  fireEvent.change(input as HTMLInputElement, { target: { files: [file] } });
}

async function heldUpload(): Promise<HeldUploadRequest> {
  await waitFor(() => {
    expect(HeldUploadRequest.sent).toHaveLength(1);
  });

  return HeldUploadRequest.sent[0];
}

async function renderEditorReadyToSave(entry: string) {
  const user = await renderEditor(entry);
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled(),
  );

  return user;
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
