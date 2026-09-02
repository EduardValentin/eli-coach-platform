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
import { http, HttpResponse, type JsonBodyType } from "msw";
import { setupServer } from "msw/node";
import { createMemoryRouter, RouterProvider } from "react-router";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { configureAxe } from "vitest-axe";

import { ToastRegion } from "@eli-coach-platform/ui";
import type { ExerciseWire } from "~/features/exercises/contracts/exercises";
import {
  createTestQueryClient,
  createTestQueryClientWrapper,
} from "~test-utils/query-client";

import { EXERCISES_API_URL, exerciseApiUrl } from "./api-client";
import ExerciseCreateRoute from "./exercise-create-page";
import ExerciseEditRoute from "./exercise-edit-page";
import ExerciseLibraryRoute from "./exercise-library-page";

const server = setupServer();
const axe = configureAxe({
  rules: {
    "color-contrast": { enabled: false },
  },
});

const squat: ExerciseWire = {
  id: "7c1a0e2c-0e4b-4a4e-9d2b-1f2e3d4c5b6a",
  name: "Barbell Back Squat",
  description: "Brace and drive through the heels.",
  difficulty: "Intermediate",
  equipment: ["Barbell"],
  primaryMuscles: ["Quadriceps", "Glutes"],
  secondaryMuscles: ["Core"],
  tags: ["Strength", "Hypertrophy"],
  video: { url: "/api/exercises/videos/exercise-videos%2Fabc.mp4", sizeBytes: 32 },
  createdAt: "2026-09-02T00:00:00.000Z",
  updatedAt: "2026-09-02T00:00:00.000Z",
};
const LIBRARY_PATH = "/coach/training/exercises";
const MEGABYTE = 1024 * 1024;

beforeAll(() => {
  // jsdom implements neither, and the field previews the picked file through both.
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

function renderEditor(initialPath: string) {
  const router = createMemoryRouter(
    [
      {
        path: LIBRARY_PATH,
        Component: ExerciseLibraryRoute,
        loader: () => ({ exercises: [squat] }),
        children: [
          { path: "new", Component: ExerciseCreateRoute },
          { path: ":exerciseId/edit", Component: ExerciseEditRoute, loader: () => squat },
        ],
      },
    ],
    { initialEntries: [initialPath] },
  );
  const Wrapper = createTestQueryClientWrapper(createTestQueryClient());

  // The portal shell provides the toast region and the main landmark in production.
  return render(
    <Wrapper>
      <ToastRegion>
        <main>
          <RouterProvider router={router} />
        </main>
      </ToastRegion>
    </Wrapper>,
  );
}

type Submission = { metadata: Record<string, unknown>; videoFilename: string | null };

/**
 * Reads the multipart body as text rather than through `request.formData()`:
 * jsdom replaces the global `File`, and undici's parser refuses a part it
 * cannot brand as its own. The body is what the server receives either way.
 */
async function readSubmission(request: Request): Promise<Submission> {
  const body = await request.text();
  // A plain field has no headers of its own: the blank line follows straight
  // after the disposition, and the value runs up to the next boundary.
  const metadata = /name="metadata"\r\n\r\n([\s\S]*?)\r\n--/.exec(body);
  const video = /name="video"; filename="([^"]+)"/.exec(body);

  return {
    metadata: metadata ? (JSON.parse(metadata[1]!) as Record<string, unknown>) : {},
    videoFilename: video?.[1] ?? null,
  };
}

function recordSubmissions(options: {
  method: "post" | "patch";
  response?: { body: JsonBodyType; status: number };
  url: string;
}) {
  const received: Submission[] = [];
  const response = options.response ?? {
    body: { success: true, exercise: squat },
    status: options.method === "post" ? 201 : 200,
  };

  server.use(
    http[options.method](options.url, async ({ request }) => {
      received.push(await readSubmission(request));

      return HttpResponse.json(response.body, { status: response.status });
    }),
  );

  return received;
}

const mp4File = (name = "squat-demo.mp4") => new File(["x"], name, { type: "video/mp4" });
const dropzone = () => screen.getByText("Drag and drop video").closest("div") as HTMLElement;
const fileInput = () => screen.getByLabelText("Demonstration video file") as HTMLInputElement;
const dialog = (name: string) => screen.findByRole("dialog", { name });
const tagChip = (scope: HTMLElement, name: string) =>
  within(within(scope).getByRole("group", { name: "Tags" })).getByRole("button", { name });

describe("creating an exercise", () => {
  it("requires a name inline and saves nothing", async () => {
    // arrange
    const user = userEvent.setup();
    const received = recordSubmissions({ method: "post", url: EXERCISES_API_URL });
    renderEditor(`${LIBRARY_PATH}/new`);
    const createDialog = await dialog("Create New Exercise");

    // act
    await user.click(within(createDialog).getByRole("button", { name: "Create Exercise" }));

    // assert
    expect(
      await within(createDialog).findByText("Exercise name is required"),
    ).toBeInTheDocument();
    expect(received).toHaveLength(0);
    expect(screen.getByRole("dialog", { name: "Create New Exercise" })).toBeInTheDocument();
  });

  it("accepts an .mp4 from the picker and previews it with a way to remove it", async () => {
    // arrange
    const user = userEvent.setup();
    renderEditor(`${LIBRARY_PATH}/new`);
    const createDialog = await dialog("Create New Exercise");

    // act
    await user.upload(fileInput(), mp4File());

    // assert
    expect(within(createDialog).queryByText("Drag and drop video")).not.toBeInTheDocument();
    expect(createDialog.querySelector("video")).toHaveAttribute("src", "blob:preview");
    expect(within(createDialog).getByRole("button", { name: "Remove video" })).toBeInTheDocument();

    // act — remove it again
    await user.click(within(createDialog).getByRole("button", { name: "Remove video" }));

    // assert
    expect(within(createDialog).getByText("Drag and drop video")).toBeInTheDocument();
    expect(createDialog.querySelector("video")).toBeNull();
  });

  it("rejects a dropped .mov naming the file, and clears the error once an .mp4 lands", async () => {
    // arrange
    renderEditor(`${LIBRARY_PATH}/new`);
    const createDialog = await dialog("Create New Exercise");

    // act — drag-and-drop bypasses `accept`, so the field checks the file itself
    fireEvent.drop(dropzone(), {
      dataTransfer: { files: [new File(["x"], "squat-demo.mov", { type: "video/quicktime" })] },
    });

    // assert
    expect(
      within(createDialog).getByText("squat-demo.mov is not an .mp4 — only .mp4 videos are supported"),
    ).toBeInTheDocument();
    expect(within(createDialog).getByRole("button", { name: "Browse Files" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );

    // act
    fireEvent.drop(dropzone(), { dataTransfer: { files: [mp4File()] } });

    // assert
    expect(within(createDialog).queryByText(/is not an \.mp4/)).not.toBeInTheDocument();
    expect(createDialog.querySelector("video")).not.toBeNull();
  });

  it("rejects a file over 50 MB", async () => {
    // arrange
    const user = userEvent.setup();
    renderEditor(`${LIBRARY_PATH}/new`);
    const createDialog = await dialog("Create New Exercise");
    const oversized = mp4File("long-demo.mp4");
    Object.defineProperty(oversized, "size", { value: 50 * MEGABYTE + 1 });

    // act
    await user.upload(fileInput(), oversized);

    // assert
    expect(
      within(createDialog).getByText("long-demo.mp4 is larger than 50 MB"),
    ).toBeInTheDocument();
    expect(createDialog.querySelector("video")).toBeNull();
  });

  it("submits the metadata and video as multipart, then returns to the library with a toast", async () => {
    // arrange
    const user = userEvent.setup();
    const received = recordSubmissions({ method: "post", url: EXERCISES_API_URL });
    renderEditor(`${LIBRARY_PATH}/new`);
    const createDialog = await dialog("Create New Exercise");

    // act
    await user.type(within(createDialog).getByLabelText("Exercise Name"), "Cossack Squat");
    await user.click(tagChip(createDialog, "Recovery"));
    await user.click(within(createDialog).getByRole("radio", { name: "Advanced" }));
    await user.upload(fileInput(), mp4File());
    await user.click(within(createDialog).getByRole("button", { name: "Create Exercise" }));

    // assert
    await waitFor(() => expect(received).toHaveLength(1));
    expect(received[0]!.metadata).toMatchObject({
      name: "Cossack Squat",
      difficulty: "Advanced",
      tags: ["Recovery"],
    });
    // jsdom's File loses its name when undici serialises it, so only the
    // part's presence is asserted here; the integration suite checks the name.
    expect(received[0]!.videoFilename).not.toBeNull();
    expect(
      await within(screen.getByRole("region", { name: /Notifications/ })).findByText(
        "Exercise created",
      ),
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("shows a server rejection inline and keeps the dialog open", async () => {
    // arrange
    const user = userEvent.setup();
    recordSubmissions({
      method: "post",
      response: {
        body: {
          success: false,
          error: {
            code: "validation_failed",
            message: "The exercise was rejected.",
            issues: [{ code: "unsupported_video_content", path: ["video"], message: "Only .mp4 videos are supported." }],
          },
        },
        status: 400,
      },
      url: EXERCISES_API_URL,
    });
    renderEditor(`${LIBRARY_PATH}/new`);
    const createDialog = await dialog("Create New Exercise");

    // act
    await user.type(within(createDialog).getByLabelText("Exercise Name"), "Cossack Squat");
    await user.click(within(createDialog).getByRole("button", { name: "Create Exercise" }));

    // assert
    expect(
      await within(createDialog).findByText("Only .mp4 videos are supported."),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Create New Exercise" })).toBeInTheDocument();
  });

  it("closes back to the library on Cancel and on Escape", async () => {
    // arrange
    const user = userEvent.setup();
    renderEditor(`${LIBRARY_PATH}/new`);
    const createDialog = await dialog("Create New Exercise");

    // act
    await user.click(within(createDialog).getByRole("button", { name: "Cancel" }));

    // assert
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("table")).toBeInTheDocument();

    // arrange — a second visit, dismissed from the keyboard
    cleanup();
    renderEditor(`${LIBRARY_PATH}/new`);
    await dialog("Create New Exercise");

    // act
    await user.keyboard("{Escape}");

    // assert
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("has no obvious accessibility violations with the dialog open", async () => {
    // arrange
    const { baseElement } = renderEditor(`${LIBRARY_PATH}/new`);
    await dialog("Create New Exercise");

    // act
    const results = await axe(baseElement);

    // assert
    expect(results.violations).toEqual([]);
  });
});

describe("editing an exercise", () => {
  it("prefills the stored exercise, plays its video, and can detach it", async () => {
    // arrange
    const user = userEvent.setup();
    const received = recordSubmissions({ method: "patch", url: exerciseApiUrl(squat.id) });
    renderEditor(`${LIBRARY_PATH}/${squat.id}/edit`);
    const editDialog = await dialog("Edit Exercise");

    // assert — the stored values are what the coach sees
    expect(within(editDialog).getByLabelText("Exercise Name")).toHaveValue("Barbell Back Squat");
    expect(tagChip(editDialog, "Strength")).toHaveAttribute("aria-pressed", "true");
    expect(tagChip(editDialog, "Recovery")).toHaveAttribute("aria-pressed", "false");
    expect(within(editDialog).getByRole("radio", { name: "Intermediate" })).toBeChecked();
    expect(editDialog.querySelector("video")).toHaveAttribute("src", squat.video!.url);
    expect(
      within(within(editDialog).getByRole("group", { name: "Secondary" })).queryByRole("button", { name: "Glutes" }),
    ).not.toBeInTheDocument();

    // act
    await user.click(within(editDialog).getByRole("button", { name: "Remove video" }));
    await user.click(within(editDialog).getByRole("button", { name: "Save Changes" }));

    // assert
    await waitFor(() => expect(received).toHaveLength(1));
    expect(received[0]!.metadata).toMatchObject({ name: "Barbell Back Squat", video: "remove" });
    expect(received[0]!.videoFilename).toBeNull();
    expect(
      await within(screen.getByRole("region", { name: /Notifications/ })).findByText(
        "Exercise updated",
      ),
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("keeps the stored video when nothing about it changes", async () => {
    // arrange
    const user = userEvent.setup();
    const received = recordSubmissions({ method: "patch", url: exerciseApiUrl(squat.id) });
    renderEditor(`${LIBRARY_PATH}/${squat.id}/edit`);
    const editDialog = await dialog("Edit Exercise");

    // act
    await user.click(tagChip(editDialog, "Recovery"));
    await user.click(within(editDialog).getByRole("button", { name: "Save Changes" }));

    // assert
    await waitFor(() => expect(received).toHaveLength(1));
    expect(received[0]!.metadata).toMatchObject({
      tags: ["Strength", "Hypertrophy", "Recovery"],
      video: "keep",
    });
  });
});
