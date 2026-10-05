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
import type { ClientResourceView } from "~/features/client-resources/contracts/client-resources";
import {
  CLIENT_RESOURCES_API_PATHS,
  clientResourcesPath,
  COACH_CLIENT_RESOURCES_ROUTE_SEGMENT,
  coachClientResourcesPath,
} from "~/features/client-resources/contracts/paths";
import type { CoachClient } from "~/features/coaching-sales/contracts/coach-clients";
import { coachClientPath } from "~/features/coaching-sales/contracts/paths";

import CoachClientResourcesRoute, { ErrorBoundary } from "./client-resources";

const COACH_TIME_ZONE = "Europe/Bucharest";
const CLIENT_ID = "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11";
const UPLOAD_URL = `http://localhost${clientResourcesPath(CLIENT_ID)}`;
const MEGABYTE = 1024 * 1024;
const DROP_PROMPT = "Drop a file here or choose one";

const CLIENT: CoachClient = {
  clientId: CLIENT_ID,
  email: "andreea@example.com",
  firstName: "Andreea",
  invitation: null,
  lastName: "Popescu",
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
    kind: "image",
    sizeBytes: 412_000,
    pageCount: 1,
  },
  addedAt: "2026-10-04T09:00:00.000Z",
};

const WARM_UP: ClientResourceView = {
  id: "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
  title: "Glute activation warm-up",
  description:
    "Run through this before every lower-body session. Ten minutes is enough.",
  file: {
    originalName: "glute-activation-warm-up.pdf",
    kind: "pdf",
    sizeBytes: 1_840_000,
    pageCount: 3,
  },
  addedAt: "2026-10-02T22:30:00.000Z",
};

const FOOD_DIARY: ClientResourceView = {
  id: "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e",
  title: "Food diary template",
  description: "",
  file: {
    originalName: "food-diary-template.docx",
    kind: "word",
    sizeBytes: 310_000,
    pageCount: null,
  },
  addedAt: "2026-10-01T09:00:00.000Z",
};

const MACRO_TRACKER: ClientResourceView = {
  id: "3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f",
  title: "Weekly macro tracker",
  description: "Fill in one row a day. Totals add up on their own.",
  file: {
    originalName: "weekly-macro-tracker.xlsx",
    kind: "excel",
    sizeBytes: 96_000,
    pageCount: null,
  },
  addedAt: "2026-09-29T09:00:00.000Z",
};

const LIBRARY = [PLATE_GUIDE, WARM_UP, FOOD_DIARY, MACRO_TRACKER];

const ADDED: ClientResourceView = {
  id: "4d5e6f7a-8b9c-4d0e-9f1a-2b3c4d5e6f7a",
  title: "Meal plan week one",
  description: "Start on Monday.",
  file: {
    originalName: "meal-plan-week-one.pdf",
    kind: "pdf",
    sizeBytes: 2 * MEGABYTE,
    pageCount: 2,
  },
  addedAt: "2026-10-05T09:00:00.000Z",
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

  readonly upload = new EventTarget();
  status = 0;
  responseText = "";

  open() {}

  setRequestHeader() {}

  getResponseHeader(name: string): string | null {
    return name.toLowerCase() === "content-type" ? "application/json" : null;
  }

  send() {
    HeldUploadRequest.sent.push(this);
  }

  abort() {}

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
    const cards = within(grid).getAllByRole("button");
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

  it("says the resources did not load and loads them again when she tries again", async () => {
    // arrange
    let reads = 0;
    const { user } = await renderResourcesRouter(() => {
      reads += 1;
      if (reads === 1) throw new Error("The resources could not be read.");

      return { client: CLIENT, resources: LIBRARY };
    });
    expect(await screen.findByText("Resources didn’t load")).toBeVisible();

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

  it("shows how much has been sent while the file uploads and takes no second submission", async () => {
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
    fireEvent.submit(
      within(dialog)
        .getByRole("textbox", { name: "Title" })
        .closest("form") as HTMLFormElement,
    );

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
      expect(
        within(grid)
          .getAllByRole("button")
          .map((card) => card.textContent),
      ).toEqual([
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
    "shows $title as a file cover with its file name and no pages",
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

  it("downloads the original under its own name", async () => {
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

type ResourcesPageData = {
  client: CoachClient;
  resources: ClientResourceView[];
};

type SentUpload = { fileName: string; title: string; description: string };

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
      resources: [...store.resources],
    }),
  };

  return store;
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
