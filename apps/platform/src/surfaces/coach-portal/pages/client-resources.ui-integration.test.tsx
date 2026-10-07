// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { MAX_RESOURCE_TITLE_LENGTH } from "@eli-coach-platform/domain/client-resources";
import { Toaster } from "@eli-coach-platform/ui/toast";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { MotionConfig } from "motion/react";
import {
  createMemoryRouter,
  Outlet,
  RouterProvider,
  type ActionFunction,
} from "react-router";
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

import { clientAction as uploadResource } from "~/features/client-resources/api/resources/client-resources";
import { clientAction as changeOrRemoveResource } from "~/features/client-resources/api/resources/resource";
import type {
  ClientResourceListing,
  ClientResourceView,
} from "~/features/client-resources/contracts/client-resources";
import {
  CLIENT_RESOURCES_API_PATHS,
  clientResourcesPath,
  COACH_CLIENT_RESOURCES_ROUTE_SEGMENT,
  coachClientResourcesPath,
} from "~/features/client-resources/contracts/paths";
import type { CoachClient } from "~/features/coaching-sales/contracts/coach-clients";
import { coachClientPath } from "~/features/coaching-sales/contracts/paths";
import { frameworkModeAction } from "~/server/test-support/framework-mode-action";

import CoachClientResourcesRoute, { ErrorBoundary } from "./client-resources";

const COACH_TIME_ZONE = "Europe/Bucharest";
const CLIENT_ID = "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11";
const UPLOAD_URL = `http://localhost${clientResourcesPath(CLIENT_ID)}`;
const RESOURCE_URL = `http://localhost${CLIENT_RESOURCES_API_PATHS.resource}`;
const HEADING = "Andreea’s resources";
const DELETE_FAILED = "The resource wasn’t deleted. Try again.";
const MEGABYTE = 1024 * 1024;
const DROP_PROMPT = "Drop a file here or choose one";

const CLIENT: CoachClient = {
  clientId: CLIENT_ID,
  email: "andreea@example.com",
  firstName: "Andreea",
  invitation: null,
  lastName: "Popescu",
  needsRefund: false,
  subscriptionCancelledOrEnded: false,
  assessmentCall: {
    startsAt: "2026-09-18T12:00:00.000Z",
    firstName: "Andreea",
    lastName: "Popescu",
    email: "andreea@example.com",
    dateOfBirth: "1994-03-14",
    gender: "female",
    country: "RO",
    phone: null,
    primaryGoal: "build_strength",
    notes: null,
  },
  gender: "female",
  status: "awaiting-review",
  subscription: null,
};

const PLATE_GUIDE: ClientResourceView = {
  id: "0f1e2d3c-4b5a-4968-8776-655443322110",
  title: "Plate portions guide",
  description: "Half the plate vegetables, a quarter protein, a quarter carbs.",
  file: {
    originalName: "plate-portions.png",
    downloadName: "plate-portions.png",
    kind: "image",
    sizeBytes: 412_000,
    pageCount: 1,
  },
  addedAt: "2026-10-04T09:00:00.000Z",
  openedAt: null,
};

const WARM_UP: ClientResourceView = {
  id: "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
  title: "Glute activation warm-up",
  description:
    "Run through this before every lower-body session. Ten minutes is enough.",
  file: {
    originalName: "glute-activation-warm-up.pdf",
    downloadName: "glute-activation-warm-up.pdf",
    kind: "pdf",
    sizeBytes: 1_840_000,
    pageCount: 3,
  },
  addedAt: "2026-10-02T22:30:00.000Z",
  openedAt: null,
};

const FOOD_DIARY: ClientResourceView = {
  id: "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e",
  title: "Food diary template",
  description: "",
  file: {
    originalName: "food-diary-template.docm",
    downloadName: "food-diary-template.docx",
    kind: "word",
    sizeBytes: 310_000,
    pageCount: null,
  },
  addedAt: "2026-10-01T09:00:00.000Z",
  openedAt: null,
};

const MACRO_TRACKER: ClientResourceView = {
  id: "3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f",
  title: "Weekly macro tracker",
  description: "Fill in one row a day. Totals add up on their own.",
  file: {
    originalName: "weekly-macro-tracker.xlsx",
    downloadName: "weekly-macro-tracker.xlsx",
    kind: "excel",
    sizeBytes: 96_000,
    pageCount: null,
  },
  addedAt: "2026-09-29T09:00:00.000Z",
  openedAt: null,
};

const LIBRARY = [PLATE_GUIDE, WARM_UP, FOOD_DIARY, MACRO_TRACKER];

const ADDED: ClientResourceView = {
  id: "4d5e6f7a-8b9c-4d0e-9f1a-2b3c4d5e6f7a",
  title: "Meal plan week one",
  description: "Start on Monday.",
  file: {
    originalName: "meal-plan-week-one.pdf",
    downloadName: "meal-plan-week-one.pdf",
    kind: "pdf",
    sizeBytes: 2 * MEGABYTE,
    pageCount: 2,
  },
  addedAt: "2026-10-05T09:00:00.000Z",
  openedAt: null,
};

const REFUSALS = [
  { refusal: "unsupported-type", message: "That file type can’t be added." },
  { refusal: "too-large", message: "That file is over 25 MB." },
  { refusal: "too-many-pages", message: "That PDF has more than 50 pages." },
  {
    refusal: "unreadable",
    message:
      "That PDF can’t be opened. It may be damaged or password protected.",
  },
] as const;

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

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  coachIsIn(COACH_TIME_ZONE);
  HeldUploadRequest.sent = [];
  HeldUploadRequest.whenSent = () => {};
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

afterAll(() => {
  server.close();
});

describe("the coach's client resources page", () => {
  it("offers one way to add the first resource while she has none", async () => {
    // arrange, act
    await renderResourcesPage({ resources: [] });

    // assert
    expect(
      screen.getByRole("heading", { level: 1, name: "Andreea’s resources" }),
    ).toBeInTheDocument();
    expect(screen.getByText("No resources yet")).toBeInTheDocument();
    expect(
      screen.getByText("Share a guide, a plan or a photo with Andreea."),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Add resource" }),
    ).toHaveLength(1);
    expect(
      screen.queryByRole("region", { name: "Resources" }),
    ).not.toBeInTheDocument();
  });

  it("leads back to her record", async () => {
    // arrange, act
    await renderResourcesPage();

    // assert
    expect(
      screen.getByRole("link", { name: "Back to Andreea Popescu" }),
    ).toHaveAttribute("href", coachClientPath(CLIENT_ID));
  });

  it("lists her resources in the order given, newest first, each a card named by its title", async () => {
    // arrange, act
    await renderResourcesPage();

    // assert
    const grid = screen.getByRole("region", { name: "Resources" });
    const cards = resourceCardsIn(grid);
    expect(cards.map((card) => card.textContent)).toEqual([
      "IMGPlate portions guide",
      "PDF3 pagesGlute activation warm-up",
      "DOCFood diary template",
      "XLSWeekly macro tracker",
    ]);
    expect(cards[1]).toHaveAccessibleName("Glute activation warm-up");
    expect(cards[1]).toHaveAccessibleDescription("PDF 3 pages");
    expect(
      screen.getAllByRole("button", { name: "Add resource" }),
    ).toHaveLength(1);
  });

  it("never marks a resource new for the coach, whether the client opened it or not", async () => {
    // arrange, act
    await renderResourcesPage({
      resources: [
        PLATE_GUIDE,
        { ...WARM_UP, openedAt: "2026-10-03T08:00:00.000Z" },
      ],
    });

    // assert
    const grid = screen.getByRole("region", { name: "Resources" });
    expect(within(grid).queryByText("New")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Plate portions guide" }),
    ).toHaveAccessibleDescription("IMG");
  });

  it("shows a page preview for a PDF or an image and a file cover for Word and Excel", async () => {
    // arrange, act
    await renderResourcesPage();

    // assert
    const thumbnails = screen
      .getAllByRole("listitem")
      .map((card) => card.querySelector("img")?.getAttribute("src") ?? null);
    expect(thumbnails).toEqual([
      `/api/client-resources/${PLATE_GUIDE.id}/thumbnail`,
      `/api/client-resources/${WARM_UP.id}/thumbnail`,
      null,
      null,
    ]);
  });

  it("answers a client the coach does not have with client not found", async () => {
    // arrange, act
    await renderResourcesRouter(() => {
      throw new Response("Not Found", { status: 404 });
    });

    // assert
    expect(await screen.findByText("Client not found")).toBeInTheDocument();
  });

  it("says her resources did not load under the way back to her record, without the page header", async () => {
    // arrange, act
    await renderResourcesRouter(() => ({
      client: CLIENT,
      listing: { status: "unavailable" },
    }));

    // assert
    expect(screen.getByRole("heading", { level: 1 })).toHaveAccessibleName(
      "Resources didn’t load",
    );
    expect(
      screen.getByRole("link", { name: "Back to Andreea Popescu" }),
    ).toHaveAttribute("href", coachClientPath(CLIENT_ID));
    expect(
      screen.queryByRole("heading", { name: "Andreea’s resources" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add resource" }),
    ).not.toBeInTheDocument();
  });

  it("loads her resources again when the coach tries again", async () => {
    // arrange
    let reads = 0;
    const { user } = await renderResourcesRouter(() => {
      reads += 1;

      return {
        client: CLIENT,
        listing:
          reads === 1
            ? { status: "unavailable" }
            : { status: "ready", resources: LIBRARY },
      };
    });

    // act
    await user.click(screen.getByRole("button", { name: "Try again" }));

    // assert
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Andreea’s resources",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Plate portions guide" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Resources didn’t load")).not.toBeInTheDocument();
  });
});

describe("adding a resource", () => {
  it("takes a picked file with its size and suggests a title from its name", async () => {
    // arrange
    const { user } = await renderResourcesPage({ resources: [] });
    const dialog = await openAddDialog(user);

    // act
    await user.upload(
      within(dialog).getByLabelText(DROP_PROMPT),
      fileNamed("meal-plan_week-one.pdf", 2 * MEGABYTE),
    );

    // assert
    expect(within(dialog).getByText("meal-plan_week-one.pdf")).toBeVisible();
    expect(within(dialog).getByText("2.0 MB")).toBeVisible();
    expect(within(dialog).getByRole("textbox", { name: "Title" })).toHaveValue(
      "Meal plan week one",
    );
    expect(
      within(dialog).queryByLabelText(DROP_PROMPT),
    ).not.toBeInTheDocument();
  });

  it("takes a dropped file", async () => {
    // arrange
    const { user } = await renderResourcesPage({ resources: [] });
    const dialog = await openAddDialog(user);

    // act
    dropFile(dialog, fileNamed("plate-portions.png", 400_000));

    // assert
    expect(await within(dialog).findByText("plate-portions.png")).toBeVisible();
    expect(within(dialog).getByRole("textbox", { name: "Title" })).toHaveValue(
      "Plate portions",
    );
  });

  it("replaces the chosen file and the title it suggested", async () => {
    // arrange
    const { user } = await renderResourcesPage({ resources: [] });
    const dialog = await openAddDialog(user);
    await user.upload(
      within(dialog).getByLabelText(DROP_PROMPT),
      fileNamed("first-draft.pdf"),
    );

    // act
    await user.upload(
      within(dialog).getByLabelText("Replace"),
      fileNamed("final-plan.pdf"),
    );

    // assert
    expect(within(dialog).getByText("final-plan.pdf")).toBeVisible();
    expect(
      within(dialog).queryByText("first-draft.pdf"),
    ).not.toBeInTheDocument();
    expect(within(dialog).getByRole("textbox", { name: "Title" })).toHaveValue(
      "Final plan",
    );
  });

  it("keeps a title she typed when she replaces the file", async () => {
    // arrange
    const { user } = await renderResourcesPage({ resources: [] });
    const dialog = await openAddDialog(user);
    await user.upload(
      within(dialog).getByLabelText(DROP_PROMPT),
      fileNamed("first-draft.pdf"),
    );
    const title = within(dialog).getByRole("textbox", { name: "Title" });
    await user.clear(title);
    await user.type(title, "Your plan");

    // act
    await user.upload(
      within(dialog).getByLabelText("Replace"),
      fileNamed("final-plan.pdf"),
    );

    // assert
    expect(within(dialog).getByText("final-plan.pdf")).toBeVisible();
    expect(title).toHaveValue("Your plan");
  });

  it("asks for a file and a title before it sends anything", async () => {
    // arrange
    const { user } = await renderResourcesPage({ resources: [] });
    const dialog = await openAddDialog(user);
    const sent = recordUploads();

    // act
    await user.click(
      within(dialog).getByRole("button", { name: "Add resource" }),
    );

    // assert
    expect(within(dialog).getByText("Choose a file to add.")).toBeVisible();
    expect(within(dialog).getByLabelText(DROP_PROMPT)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(
      within(dialog).getByLabelText(DROP_PROMPT),
    ).toHaveAccessibleDescription(
      "PDF, Word, Excel or image · up to 25 MB Choose a file to add.",
    );
    expect(
      within(dialog).getByRole("textbox", { name: "Title" }),
    ).toHaveAccessibleDescription("Give it a title.");
    expect(sent).toEqual([]);
  });

  it.each([
    {
      file: fileNamed("slides.pptx"),
      message: "That file type can’t be added.",
    },
    {
      file: fileNamed("scan.pdf", 25 * MEGABYTE + 1),
      message: "That file is over 25 MB.",
    },
  ])(
    "refuses $file.name as soon as she chooses it",
    async ({ file, message }) => {
      // arrange
      const { user } = await renderResourcesPage({ resources: [] });
      const dialog = await openAddDialog(user);

      // act
      dropFile(dialog, file);

      // assert
      expect(await within(dialog).findByText(message)).toBeVisible();
      expect(
        within(dialog).getByLabelText(DROP_PROMPT),
      ).toHaveAccessibleDescription(
        `PDF, Word, Excel or image · up to 25 MB ${message}`,
      );
      expect(
        within(dialog).getByRole("textbox", { name: "Title" }),
      ).toHaveValue("");
    },
  );

  it.each(REFUSALS)(
    "shows the server's $refusal refusal at the file and keeps her entries",
    async ({ refusal, message }) => {
      // arrange
      server.use(
        http.post(UPLOAD_URL, () =>
          HttpResponse.json({ refusal }, { status: 422 }),
        ),
      );
      const { user } = await renderResourcesPage({ resources: [] });
      const dialog = await openFilledAddDialog(user);

      // act
      await user.click(
        within(dialog).getByRole("button", { name: "Add resource" }),
      );

      // assert
      expect(await within(dialog).findByText(message)).toBeVisible();
      expect(
        within(dialog).getByLabelText("Replace"),
      ).toHaveAccessibleDescription(message);
      expect(within(dialog).getByText("meal-plan-week-one.pdf")).toBeVisible();
      expect(
        within(dialog).getByRole("textbox", { name: "Title" }),
      ).toHaveValue("Meal plan week one");
      expect(
        within(dialog).getByRole("textbox", { name: "Description (optional)" }),
      ).toHaveValue("Start on Monday.");
      expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
      expect(
        within(dialog).getByRole("button", { name: "Add resource" }),
      ).toBeEnabled();
    },
  );

  it("shows how much has been sent while the file uploads", async () => {
    // arrange
    vi.stubGlobal("XMLHttpRequest", HeldUploadRequest);
    const { user } = await renderResourcesPage({ resources: [] });
    const dialog = await openFilledAddDialog(user);
    await user.click(
      within(dialog).getByRole("button", { name: "Add resource" }),
    );
    const upload = await heldUpload();

    // act
    upload.reportBytesSent(0.4);

    // assert
    await waitFor(() => {
      expect(
        within(dialog).getByRole("progressbar", { name: "Upload progress" }),
      ).toHaveAttribute("aria-valuenow", "40");
    });
    expect(
      within(dialog).getByRole("button", { name: "Uploading…" }),
    ).toBeDisabled();
    expect(
      within(dialog).getByRole("button", { name: "Cancel" }),
    ).toBeDisabled();
    expect(within(dialog).queryByLabelText("Replace")).not.toBeInTheDocument();
  });

  it("keeps the upload going when she submits again before the dialog shows it is busy", async () => {
    // arrange
    vi.stubGlobal("XMLHttpRequest", HeldUploadRequest);
    const { user } = await renderResourcesPage({ resources: [] });
    const dialog = await openFilledAddDialog(user);
    const form = within(dialog)
      .getByRole("textbox", { name: "Title" })
      .closest("form") as HTMLFormElement;
    HeldUploadRequest.whenSent = () => {
      HeldUploadRequest.whenSent = () => {};
      fireEvent.submit(form);
    };

    // act
    await user.click(
      within(dialog).getByRole("button", { name: "Add resource" }),
    );
    const upload = await heldUpload();
    upload.reportBytesSent(0.4);

    // assert
    await waitFor(() => {
      expect(
        within(dialog).getByRole("progressbar", { name: "Upload progress" }),
      ).toHaveAttribute("aria-valuenow", "40");
    });
    expect(upload.aborted).toBe(false);
    expect(HeldUploadRequest.sent).toHaveLength(1);
  });

  it("shows the preparing state once every byte is sent and cannot be dismissed until the server answers", async () => {
    // arrange
    vi.stubGlobal("XMLHttpRequest", HeldUploadRequest);
    const { user } = await renderResourcesPage({ resources: [] });
    const dialog = await openFilledAddDialog(user);
    await user.click(
      within(dialog).getByRole("button", { name: "Add resource" }),
    );
    const upload = await heldUpload();

    // act
    upload.finishSending();
    const preparing = await within(dialog).findByRole("progressbar", {
      name: "Preparing pages",
    });
    await user.keyboard("{Escape}");

    // assert
    expect(preparing).not.toHaveAttribute("aria-valuenow");
    expect(preparing).toHaveAccessibleDescription(
      "Large files can take a minute or two.",
    );
    expect(
      within(dialog).getByRole("button", { name: "Preparing pages…" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("dialog", { name: "Add resource" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByRole("button", { name: "Close" }),
    ).not.toBeInTheDocument();
  });

  it("keeps her entries and says so when the upload does not go through", async () => {
    // arrange
    server.use(
      http.post(
        UPLOAD_URL,
        () => new HttpResponse("Internal Server Error", { status: 500 }),
      ),
    );
    const { user } = await renderResourcesPage({ resources: [] });
    const dialog = await openFilledAddDialog(user);

    // act
    await user.click(
      within(dialog).getByRole("button", { name: "Add resource" }),
    );

    // assert
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "The upload didn’t go through. Try again.",
    );
    expect(within(dialog).getByText("meal-plan-week-one.pdf")).toBeVisible();
    expect(within(dialog).getByRole("textbox", { name: "Title" })).toHaveValue(
      "Meal plan week one",
    );
    expect(
      within(dialog).getByRole("textbox", { name: "Description (optional)" }),
    ).toHaveValue("Start on Monday.");
    expect(
      within(dialog).getByRole("button", { name: "Add resource" }),
    ).toBeEnabled();
  });

  it("adds the resource when she tries again after a failed upload", async () => {
    // arrange
    const store = libraryStore([]);
    let attempts = 0;
    server.use(
      http.post(UPLOAD_URL, () => {
        attempts += 1;
        if (attempts === 1) {
          return new HttpResponse("Internal Server Error", { status: 500 });
        }
        store.resources.unshift(ADDED);

        return HttpResponse.json({ resource: ADDED }, { status: 201 });
      }),
    );
    const { user } = await renderResourcesRouter(store.load);
    const dialog = await openFilledAddDialog(user);
    await user.click(
      within(dialog).getByRole("button", { name: "Add resource" }),
    );
    await within(dialog).findByRole("alert");

    // act
    await user.click(
      within(dialog).getByRole("button", { name: "Add resource" }),
    );

    // assert
    expect(await screen.findByText("Resource added.")).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "Meal plan week one" }),
    ).toBeInTheDocument();
  });

  it("sends the file with her title and description, closes, confirms and lists the new resource first", async () => {
    // arrange
    const store = libraryStore([WARM_UP]);
    const sent = recordUploads(store);
    const { user } = await renderResourcesRouter(store.load);
    const dialog = await openFilledAddDialog(user);
    await user.type(
      within(dialog).getByRole("textbox", { name: "Title" }),
      "  ",
    );

    // act
    await user.click(
      within(dialog).getByRole("button", { name: "Add resource" }),
    );

    // assert
    expect(await screen.findByText("Resource added.")).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Add resource" }),
      ).not.toBeInTheDocument();
    });
    const grid = screen.getByRole("region", { name: "Resources" });
    await waitFor(() => {
      expect(resourceCardsIn(grid).map((card) => card.textContent)).toEqual([
        "PDF2 pagesMeal plan week one",
        "PDF3 pagesGlute activation warm-up",
      ]);
    });
    expect(sent).toEqual([
      {
        description: "Start on Monday.",
        fileName: "meal-plan-week-one.pdf",
        title: "Meal plan week one",
      },
    ]);
  });
});

describe("the resource viewer", () => {
  it("opens a PDF on its first page with only the way forward offered", async () => {
    // arrange
    const { user } = await renderResourcesPage();

    // act
    const viewer = await openResource(user, "Glute activation warm-up");

    // assert
    expect(within(viewer).getByText("1 / 3")).toBeVisible();
    expect(within(viewer).getByRole("img")).toHaveAttribute(
      "src",
      `/api/client-resources/${WARM_UP.id}/pages/1`,
    );
    expect(within(viewer).getByRole("img")).toHaveAccessibleName(
      "Glute activation warm-up, page 1",
    );
    expect(
      within(viewer).getByRole("button", { name: "Previous page" }),
    ).toBeDisabled();
    expect(
      within(viewer).getByRole("button", { name: "Next page" }),
    ).toBeEnabled();
  });

  it("steps forward by button and arrow key, announces each page and stops at the last", async () => {
    // arrange
    const { user } = await renderResourcesPage();
    const viewer = await openResource(user, "Glute activation warm-up");

    // act
    await user.click(within(viewer).getByRole("button", { name: "Next page" }));
    await user.keyboard("{ArrowRight}");
    await user.keyboard("{ArrowRight}");

    // assert
    expect(within(viewer).getByText("3 / 3")).toBeVisible();
    expect(within(viewer).getByRole("img")).toHaveAttribute(
      "src",
      `/api/client-resources/${WARM_UP.id}/pages/3`,
    );
    expect(within(viewer).getByRole("img")).toHaveAccessibleName(
      "Glute activation warm-up, page 3",
    );
    expect(
      within(viewer).getByRole("button", { name: "Next page" }),
    ).toBeDisabled();
    expect(within(viewer).getByText("Page 3 of 3")).toHaveAttribute(
      "aria-live",
      "polite",
    );
  });

  it("steps back with the left arrow key", async () => {
    // arrange
    const { user } = await renderResourcesPage();
    const viewer = await openResource(user, "Glute activation warm-up");
    await user.keyboard("{ArrowRight}");

    // act
    await user.keyboard("{ArrowLeft}");
    await user.keyboard("{ArrowLeft}");

    // assert
    expect(within(viewer).getByText("1 / 3")).toBeVisible();
    expect(within(viewer).getByText("Page 1 of 3")).toBeInTheDocument();
  });

  it("hands focus to the other page control when the one she pressed stops at an end", async () => {
    // arrange
    const { user } = await renderResourcesPage();
    const viewer = await openResource(user, "Glute activation warm-up");
    const previousPage = within(viewer).getByRole("button", {
      name: "Previous page",
    });
    const nextPage = within(viewer).getByRole("button", { name: "Next page" });
    await user.click(nextPage);

    // act
    await user.click(nextPage);

    // assert
    expect(within(viewer).getByText("3 / 3")).toBeVisible();
    expect(previousPage).toHaveFocus();

    // act
    await user.keyboard("{Enter}{Enter}");

    // assert
    expect(within(viewer).getByText("1 / 3")).toBeVisible();
    expect(nextPage).toHaveFocus();
  });

  it("shows an image as its single page with no page controls", async () => {
    // arrange
    const { user } = await renderResourcesPage();

    // act
    const viewer = await openResource(user, "Plate portions guide");

    // assert
    expect(within(viewer).getByRole("img")).toHaveAccessibleName(
      "Plate portions guide",
    );
    expect(
      within(viewer).queryByRole("button", { name: "Next page" }),
    ).not.toBeInTheDocument();
  });

  it.each([
    { title: "Food diary template", fileName: "food-diary-template.docx" },
    { title: "Weekly macro tracker", fileName: "weekly-macro-tracker.xlsx" },
  ])(
    "shows $title as a file cover with the name it downloads under and no pages",
    async ({ title, fileName }) => {
      // arrange
      const { user } = await renderResourcesPage();

      // act
      const viewer = await openResource(user, title);

      // assert
      expect(within(viewer).getByText(fileName)).toBeVisible();
      expect(within(viewer).queryByRole("img")).not.toBeInTheDocument();
      expect(
        within(viewer).queryByRole("button", { name: "Next page" }),
      ).not.toBeInTheDocument();
    },
  );

  it("describes the resource with its type, pages, size and the day it was added in the coach's time zone", async () => {
    // arrange
    const { user } = await renderResourcesPage();

    // act
    const viewer = await openResource(user, "Glute activation warm-up");

    // assert
    expect(within(viewer).getByText(WARM_UP.description)).toBeVisible();
    expect(detailsOf(viewer)).toEqual({
      Type: "PDF document",
      Pages: "3",
      Size: "1.8 MB",
      Added: "3 October",
    });
  });

  it("leaves out the page count for anything but a PDF", async () => {
    // arrange
    const { user } = await renderResourcesPage();

    // act
    const viewer = await openResource(user, "Weekly macro tracker");

    // assert
    expect(detailsOf(viewer)).toEqual({
      Type: "Spreadsheet",
      Size: "94 KB",
      Added: "29 September",
    });
  });

  it("downloads the original under the name of its real format", async () => {
    // arrange
    const { user } = await renderResourcesPage();

    // act
    const viewer = await openResource(user, "Food diary template");

    // assert
    const download = within(viewer).getByRole("link", { name: "Download" });
    expect(download).toHaveAttribute(
      "href",
      `/api/client-resources/${FOOD_DIARY.id}/download`,
    );
    expect(download).toHaveAttribute("download", "food-diary-template.docx");
  });

  it("hands focus back to the card that opened it when it closes", async () => {
    // arrange
    const { user } = await renderResourcesPage();
    const viewer = await openResource(user, "Weekly macro tracker");

    // act
    await user.click(within(viewer).getByRole("button", { name: "Close" }));

    // assert
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: "Weekly macro tracker" }),
    ).toHaveFocus();
  });
});

describe("a resource's actions", () => {
  it("offers each resource's actions in a menu named by its title, beside the card's button and never inside it", async () => {
    // arrange, act
    await renderResourcesPage();

    // assert
    for (const resource of LIBRARY) {
      const card = screen.getByRole("button", { name: resource.title });
      const menu = screen.getByRole("button", {
        name: `Actions for ${resource.title}`,
      });
      expect(card).not.toContainElement(menu);
      expect(card.closest("li")).toContainElement(menu);
    }
  });

  it("offers Edit details and Delete", async () => {
    // arrange
    const { user } = await renderResourcesPage();

    // act
    await user.click(
      screen.getByRole("button", { name: "Actions for Plate portions guide" }),
    );

    // assert
    const menu = await screen.findByRole("menu");
    expect(
      within(menu)
        .getAllByRole("menuitem")
        .map((item) => item.textContent),
    ).toEqual(["Edit details", "Delete"]);
  });

  it("offers Edit details and Delete in the opened resource's details", async () => {
    // arrange
    const { user } = await renderResourcesPage();

    // act
    const viewer = await openResource(user, "Glute activation warm-up");

    // assert
    expect(
      within(viewer).getByRole("button", { name: "Edit details" }),
    ).toBeVisible();
    expect(
      within(viewer).getByRole("button", { name: "Delete" }),
    ).toBeVisible();
  });

  it("reaches both dialogs from the keyboard alone", async () => {
    // arrange
    const { user } = await renderResourcesPage();
    const trigger = screen.getByRole("button", {
      name: "Actions for Glute activation warm-up",
    });
    await tabTo(user, trigger);

    // act
    await user.keyboard("{Enter}");
    await screen.findByRole("menu");
    await user.keyboard("{ArrowDown}{Enter}");

    // assert
    expect(
      await screen.findByRole("dialog", {
        name: "Delete “Glute activation warm-up”?",
      }),
    ).toBeInTheDocument();

    // act
    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });
    await user.keyboard("{Enter}");
    await screen.findByRole("menu");
    await user.keyboard("{Enter}");

    // assert
    expect(
      await screen.findByRole("dialog", { name: "Edit details" }),
    ).toBeInTheDocument();
  });
});

describe("editing a resource's details", () => {
  it("opens with the stored title and description and the file it holds, which cannot be replaced", async () => {
    // arrange
    const { user } = await renderResourcesPage();

    // act
    const dialog = await openEditDialog(user, "Food diary template");

    // assert
    expect(within(dialog).getByText("food-diary-template.docx")).toBeVisible();
    expect(within(dialog).getByText("303 KB")).toBeVisible();
    expect(within(dialog).getByRole("textbox", { name: "Title" })).toHaveValue(
      "Food diary template",
    );
    expect(
      within(dialog).getByRole("textbox", { name: "Description (optional)" }),
    ).toHaveValue("");
    expect(within(dialog).queryByLabelText("Replace")).not.toBeInTheDocument();
    expect(
      within(dialog).queryByLabelText(DROP_PROMPT),
    ).not.toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("offers Save only once the trimmed details differ and the title is not blank", async () => {
    // arrange
    const { user } = await renderResourcesPage();
    const dialog = await openEditDialog(user, "Plate portions guide");
    const title = within(dialog).getByRole("textbox", { name: "Title" });
    const description = within(dialog).getByRole("textbox", {
      name: "Description (optional)",
    });
    const save = within(dialog).getByRole("button", { name: "Save" });

    // act
    await user.type(title, "   ");
    await user.type(description, "  ");

    // assert
    expect(save).toBeDisabled();

    // act
    await user.type(description, " Weigh nothing.");

    // assert
    expect(save).toBeEnabled();

    // act
    await user.clear(title);

    // assert
    expect(save).toBeDisabled();
  });

  it("sends the trimmed details, closes, confirms and shows them in the open resource and on its card", async () => {
    // arrange
    const store = libraryStore(LIBRARY);
    const sent = recordDetailsChanges(store);
    const { user } = await renderResourcesRouter(store.load);
    const viewer = await openResource(user, "Glute activation warm-up");
    await user.click(
      within(viewer).getByRole("button", { name: "Edit details" }),
    );
    const dialog = await screen.findByRole("dialog", { name: "Edit details" });
    const title = within(dialog).getByRole("textbox", { name: "Title" });
    await user.clear(title);
    await user.type(title, "  Glute warm-up  ");

    // act
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    // assert
    expect(await screen.findByText("Changes saved.")).toBeInTheDocument();
    expect(
      await screen.findByRole("dialog", { name: "Glute warm-up" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: "Edit details" }),
    ).not.toBeInTheDocument();
    expect(sent).toEqual([
      {
        resourceId: WARM_UP.id,
        details: { title: "Glute warm-up", description: WARM_UP.description },
      },
    ]);

    // act
    await user.click(
      within(screen.getByRole("dialog", { name: "Glute warm-up" })).getByRole(
        "button",
        { name: "Close" },
      ),
    );

    // assert
    expect(
      await screen.findByRole("button", { name: "Glute warm-up" }),
    ).toBeInTheDocument();
  });

  it("keeps her edits and says so when the save does not go through", async () => {
    // arrange
    server.use(
      http.patch(
        RESOURCE_URL,
        () => new HttpResponse("Internal Server Error", { status: 500 }),
      ),
    );
    const { user } = await renderResourcesPage();
    const dialog = await openEditDialog(user, "Plate portions guide");
    const title = within(dialog).getByRole("textbox", { name: "Title" });
    await user.clear(title);
    await user.type(title, "Portions");

    // act
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    // assert
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Your changes weren’t saved. Try again.",
    );
    expect(title).toHaveValue("Portions");
    expect(within(dialog).getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("saves when she tries again after a failed save", async () => {
    // arrange
    const store = libraryStore(LIBRARY);
    let attempts = 0;
    server.use(
      http.patch(RESOURCE_URL, async ({ request, params }) => {
        attempts += 1;
        if (attempts === 1) {
          return new HttpResponse("Internal Server Error", { status: 500 });
        }

        return HttpResponse.json({
          resource: store.change(
            String(params.resourceId),
            (await request.json()) as ResourceDetails,
          ),
        });
      }),
    );
    const { user } = await renderResourcesRouter(store.load);
    const dialog = await openEditDialog(user, "Plate portions guide");
    const title = within(dialog).getByRole("textbox", { name: "Title" });
    await user.clear(title);
    await user.type(title, "Portions");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));
    await within(dialog).findByRole("alert");

    // act
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    // assert
    expect(await screen.findByText("Changes saved.")).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "Portions" }),
    ).toBeInTheDocument();
  });

  it("cannot be dismissed while the save is on its way", async () => {
    // arrange
    const held = holdThenFailDetailsChanges();
    const { user } = await renderResourcesPage();
    const dialog = await openEditDialog(user, "Plate portions guide");
    await user.type(
      within(dialog).getByRole("textbox", { name: "Title" }),
      " v2",
    );
    await user.click(within(dialog).getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(held).toHaveLength(1);
    });

    // act
    await user.keyboard("{Escape}");

    // assert
    expect(
      within(dialog).getByRole("button", { name: "Saving…" }),
    ).toBeDisabled();
    expect(
      within(dialog).getByRole("button", { name: "Cancel" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("dialog", { name: "Edit details" }),
    ).toBeInTheDocument();
    held[0]();
  });

  it("shows the server's problem under the title and keeps her edits", async () => {
    // arrange
    server.use(
      http.patch(RESOURCE_URL, () =>
        HttpResponse.json({ problems: { title: "too-long" } }, { status: 400 }),
      ),
    );
    const { user } = await renderResourcesPage();
    const dialog = await openEditDialog(user, "Plate portions guide");
    const title = within(dialog).getByRole("textbox", { name: "Title" });
    await user.type(title, " for every meal");

    // act
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    // assert
    await waitFor(() => {
      expect(title).toHaveAccessibleDescription(
        `Keep the title to ${MAX_RESOURCE_TITLE_LENGTH} characters.`,
      );
    });
    expect(title).toHaveValue("Plate portions guide for every meal");
    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("deleting a resource", () => {
  it("asks first, naming the resource and who loses it", async () => {
    // arrange
    const { user } = await renderResourcesPage();

    // act
    const confirm = await openDeleteConfirm(user, "Plate portions guide");

    // assert
    expect(confirm).toHaveAccessibleDescription(
      "It’s removed for you and Andreea.",
    );
    expect(
      within(confirm).getByRole("button", { name: "Delete" }),
    ).toBeVisible();
    expect(within(confirm).getByRole("button", { name: "Keep" })).toBeVisible();
  });

  it("keeps the resource and returns focus to its menu button when she keeps it", async () => {
    // arrange
    const sent = recordRemovals(libraryStore(LIBRARY));
    const { user } = await renderResourcesPage();
    const confirm = await openDeleteConfirm(user, "Plate portions guide");

    // act
    await user.click(within(confirm).getByRole("button", { name: "Keep" }));

    // assert
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: "Actions for Plate portions guide" }),
    ).toHaveFocus();
    expect(
      screen.getByRole("button", { name: "Plate portions guide" }),
    ).toBeInTheDocument();
    expect(sent).toEqual([]);
  });

  it("removes the card, confirms and moves focus to the page heading when she confirms", async () => {
    // arrange
    const store = libraryStore(LIBRARY);
    const sent = recordRemovals(store);
    const { user } = await renderResourcesRouter(store.load);
    const confirm = await openDeleteConfirm(user, "Plate portions guide");

    // act
    await user.click(within(confirm).getByRole("button", { name: "Delete" }));

    // assert
    expect(await screen.findByText("Resource deleted.")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Plate portions guide" }),
    ).not.toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1, name: HEADING }),
      ).toHaveFocus();
    });
    expect(sent).toEqual([PLATE_GUIDE.id]);
  });

  it("closes the opened resource and moves focus to the page heading when she deletes it from there", async () => {
    // arrange
    const store = libraryStore(LIBRARY);
    recordRemovals(store);
    const { user } = await renderResourcesRouter(store.load);
    const viewer = await openResource(user, "Glute activation warm-up");
    await user.click(within(viewer).getByRole("button", { name: "Delete" }));
    const confirm = await screen.findByRole("dialog", {
      name: "Delete “Glute activation warm-up”?",
    });

    // act
    await user.click(within(confirm).getByRole("button", { name: "Delete" }));

    // assert
    expect(await screen.findByText("Resource deleted.")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(
      screen.queryByRole("button", { name: "Glute activation warm-up" }),
    ).not.toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1, name: HEADING }),
      ).toHaveFocus();
    });
  });

  it("hides the resource while the removal is on its way, then tells her and brings it back when it fails", async () => {
    // arrange
    const held = holdThenFailRemovals();
    const { user } = await renderResourcesPage();
    const confirm = await openDeleteConfirm(user, "Plate portions guide");

    // act
    await user.click(within(confirm).getByRole("button", { name: "Delete" }));

    // assert
    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Plate portions guide" }),
      ).not.toBeInTheDocument();
    });

    // act
    await waitFor(() => {
      expect(held).toHaveLength(1);
    });
    held[0]();

    // assert
    expect(await screen.findByText(DELETE_FAILED)).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "Plate portions guide" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Resource deleted.")).not.toBeInTheDocument();
  });

  it("tells her and keeps the resource when the removal never reaches the server", async () => {
    // arrange
    server.use(http.delete(RESOURCE_URL, () => HttpResponse.error()));
    const { user } = await renderResourcesPage();
    const confirm = await openDeleteConfirm(user, "Weekly macro tracker");

    // act
    await user.click(within(confirm).getByRole("button", { name: "Delete" }));

    // assert
    expect(await screen.findByText(DELETE_FAILED)).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "Weekly macro tracker" }),
    ).toBeInTheDocument();
  });
});

type ResourcesPageData = {
  client: CoachClient;
  listing: ClientResourceListing;
};

type SentUpload = { fileName: string; title: string; description: string };

type ResourceDetails = { title: string; description: string };

type SentDetailsChange = { resourceId: string; details: ResourceDetails };

type UserSession = ReturnType<typeof userEvent.setup>;

const MAX_TAB_STOPS = 40;

function coachIsIn(timeZone: string) {
  const actual = new Intl.DateTimeFormat().resolvedOptions();

  vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
    ...actual,
    timeZone,
  });
}

function libraryStore(resources: ClientResourceView[]) {
  const store = {
    resources: [...resources],
    load: (): ResourcesPageData => ({
      client: CLIENT,
      listing: { status: "ready", resources: [...store.resources] },
    }),
    change: (resourceId: string, details: ResourceDetails) => {
      const changed = {
        ...(store.resources.find(
          (resource) => resource.id === resourceId,
        ) as ClientResourceView),
        ...details,
      };
      store.resources = store.resources.map((resource) =>
        resource.id === resourceId ? changed : resource,
      );

      return changed;
    },
    remove: (resourceId: string) => {
      store.resources = store.resources.filter(
        (resource) => resource.id !== resourceId,
      );
    },
  };

  return store;
}

function recordDetailsChanges(
  store: ReturnType<typeof libraryStore>,
): SentDetailsChange[] {
  const sent: SentDetailsChange[] = [];
  server.use(
    http.patch(RESOURCE_URL, async ({ params, request }) => {
      const resourceId = String(params.resourceId);
      const details = (await request.json()) as ResourceDetails;
      sent.push({ resourceId, details });

      return HttpResponse.json({ resource: store.change(resourceId, details) });
    }),
  );

  return sent;
}

function holdThenFailDetailsChanges(): (() => void)[] {
  const held: (() => void)[] = [];
  server.use(
    http.patch(RESOURCE_URL, async () => {
      await new Promise<void>((release) => {
        held.push(release);
      });

      return new HttpResponse("Internal Server Error", { status: 500 });
    }),
  );

  return held;
}

function recordRemovals(store: ReturnType<typeof libraryStore>): string[] {
  const sent: string[] = [];
  server.use(
    http.delete(RESOURCE_URL, ({ params }) => {
      const resourceId = String(params.resourceId);
      sent.push(resourceId);
      store.remove(resourceId);

      return HttpResponse.json({ status: "removed" });
    }),
  );

  return sent;
}

function holdThenFailRemovals(): (() => void)[] {
  const held: (() => void)[] = [];
  server.use(
    http.delete(RESOURCE_URL, async () => {
      await new Promise<void>((release) => {
        held.push(release);
      });

      return new HttpResponse("Internal Server Error", { status: 500 });
    }),
  );

  return held;
}

function partOf(body: string, name: string): string {
  const match = new RegExp(
    `name="${name}"(?:; filename="([^"]*)")?\\r\\n(?:Content-Type: [^\\r]*\\r\\n)?\\r\\n([^\\r]*)`,
  ).exec(body);

  return match?.[1] ?? match?.[2] ?? "";
}

function recordUploads(
  store: ReturnType<typeof libraryStore> = libraryStore([]),
): SentUpload[] {
  const sent: SentUpload[] = [];
  server.use(
    http.post(UPLOAD_URL, async ({ request }) => {
      const body = await request.text();
      sent.push({
        description: partOf(body, "description"),
        fileName: partOf(body, "file"),
        title: partOf(body, "title"),
      });
      store.resources.unshift(ADDED);

      return HttpResponse.json({ resource: ADDED }, { status: 201 });
    }),
  );

  return sent;
}

function fileNamed(name: string, size = 1024): File {
  const file = new File(["%PDF-1.7"], name);
  Object.defineProperty(file, "size", { value: size });

  return file;
}

function dropFile(dialog: HTMLElement, file: File) {
  const zone = within(dialog).getByText(DROP_PROMPT).closest("label");
  fireEvent.drop(zone as HTMLElement, { dataTransfer: { files: [file] } });
}

async function heldUpload(): Promise<HeldUploadRequest> {
  await waitFor(() => {
    expect(HeldUploadRequest.sent).toHaveLength(1);
  });

  return HeldUploadRequest.sent[0];
}

function resourceCardsIn(grid: HTMLElement): HTMLElement[] {
  return within(grid).getAllByRole("button", { name: /^(?!Actions for )/ });
}

function detailsOf(viewer: HTMLElement): Record<string, string> {
  const terms = within(viewer).getAllByRole("term");

  return Object.fromEntries(
    terms.map((term) => [
      term.textContent ?? "",
      term.nextElementSibling?.textContent ?? "",
    ]),
  );
}

async function openAddDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Add resource" }));

  return screen.findByRole("dialog", { name: "Add resource" });
}

async function openFilledAddDialog(user: ReturnType<typeof userEvent.setup>) {
  const dialog = await openAddDialog(user);
  await user.upload(
    within(dialog).getByLabelText(DROP_PROMPT),
    fileNamed("meal-plan-week-one.pdf", 2 * MEGABYTE),
  );
  await user.type(
    within(dialog).getByRole("textbox", { name: "Description (optional)" }),
    "Start on Monday.",
  );

  return dialog;
}

async function tabTo(user: UserSession, control: HTMLElement) {
  for (let stop = 0; stop < MAX_TAB_STOPS; stop += 1) {
    if (control === document.activeElement) return;
    await user.tab();
  }

  throw new Error("The keyboard never reached the expected control.");
}

async function chooseAction(
  user: UserSession,
  title: string,
  action: "Edit details" | "Delete",
) {
  await user.click(
    screen.getByRole("button", { name: `Actions for ${title}` }),
  );
  await user.click(await screen.findByRole("menuitem", { name: action }));
}

async function openEditDialog(user: UserSession, title: string) {
  await chooseAction(user, title, "Edit details");

  return screen.findByRole("dialog", { name: "Edit details" });
}

async function openDeleteConfirm(user: UserSession, title: string) {
  await chooseAction(user, title, "Delete");

  return screen.findByRole("dialog", { name: `Delete “${title}”?` });
}

async function openResource(
  user: ReturnType<typeof userEvent.setup>,
  title: string,
) {
  await user.click(screen.getByRole("button", { name: title }));

  return screen.findByRole("dialog", { name: title });
}

async function renderResourcesRouter(load: () => ResourcesPageData) {
  const user = userEvent.setup();
  const router = createMemoryRouter(
    [
      {
        Component: () => (
          <MotionConfig reducedMotion="always">
            <Outlet />
            <Toaster />
          </MotionConfig>
        ),
        children: [
          {
            Component: CoachClientResourcesRoute,
            ErrorBoundary,
            loader: load,
            path: `/coach/${COACH_CLIENT_RESOURCES_ROUTE_SEGMENT}`,
          },
        ],
      },
      {
        action: uploadResource as unknown as ActionFunction,
        path: CLIENT_RESOURCES_API_PATHS.clientResources,
      },
      {
        action: frameworkModeAction(changeOrRemoveResource),
        path: CLIENT_RESOURCES_API_PATHS.resource,
      },
    ],
    { initialEntries: [coachClientResourcesPath(CLIENT_ID)] },
  );

  render(<RouterProvider router={router} />);
  await waitFor(() => {
    expect(router.state.navigation.state).toBe("idle");
    expect(router.state.initialized).toBe(true);
  });

  return { router, user };
}

async function renderResourcesPage(
  options: { resources?: ClientResourceView[] } = {},
) {
  return renderResourcesRouter(libraryStore(options.resources ?? LIBRARY).load);
}
