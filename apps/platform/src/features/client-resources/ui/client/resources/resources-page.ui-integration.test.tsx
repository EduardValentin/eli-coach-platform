// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionConfig } from "motion/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { createMemoryRouter, RouterProvider } from "react-router";
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

import { clientAction as markOpened } from "~/features/client-resources/api/resources/resource-opened";
import type {
  ClientResourceListing,
  ClientResourceView,
} from "~/features/client-resources/contracts/client-resources";
import {
  CLIENT_RESOURCES_API_PATHS,
  CLIENT_RESOURCES_PATH,
} from "~/features/client-resources/contracts/paths";
import { frameworkModeAction } from "~/server/test-support/framework-mode-action";

import ClientResourcesRoute from "./resources-page";

const OPENED_URL = CLIENT_RESOURCES_API_PATHS.resourceOpened;
const STAMPED_AT = "2026-10-06T10:00:00.000Z";

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
  addedAt: "2026-10-04T09:00:00.000Z",
  openedAt: null,
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
  addedAt: "2026-10-02T09:00:00.000Z",
  openedAt: "2026-10-03T08:00:00.000Z",
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

const LIBRARY = [WARM_UP, PLATE_GUIDE, FOOD_DIARY];

type HeldMark = {
  resourceId: string;
  request: Request;
  release: () => void;
};

const server = setupServer();

let listing: ClientResourceListing;

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  listing = { status: "ready", resources: [...LIBRARY] };
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  vi.restoreAllMocks();
});

afterAll(() => {
  server.close();
});

describe("the client's resources page", () => {
  it("heads the page with Resources and lists hers newest first, marking only the ones she has not opened as new", async () => {
    // arrange, act
    await renderResourcesPage();

    // assert
    expect(
      screen
        .getAllByRole("heading", { level: 1 })
        .map(({ textContent }) => textContent),
    ).toEqual(["Resources"]);
    const grid = screen.getByRole("region", { name: "Resources" });
    const cards = within(grid).getAllByRole("button");
    expect(cards.map((card) => card.textContent)).toEqual([
      "PDF3 pagesNewGlute activation warm-up",
      "IMGPlate portions guide",
      "DOCNewFood diary template",
    ]);
    expect(cards[0]).toHaveAccessibleName("Glute activation warm-up");
    expect(cards[0]).toHaveAccessibleDescription("PDF 3 pages New");
    expect(cards[1]).toHaveAccessibleDescription("IMG");
  });

  it("offers her nothing to add, edit or delete", async () => {
    // arrange, act
    await renderResourcesPage();

    // assert
    const grid = screen.getByRole("region", { name: "Resources" });
    expect(
      screen.getAllByRole("button").filter((button) => !grid.contains(button)),
    ).toEqual([]);
    expect(
      screen.queryByRole("button", { name: /add|edit|delete|remove/i }),
    ).not.toBeInTheDocument();
  });

  it("tells her when nothing has been shared yet", async () => {
    // arrange
    listing = { status: "ready", resources: [] };

    // act
    await renderResourcesPage();

    // assert
    expect(
      screen.getByRole("heading", { level: 1, name: "Resources" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "When your coach shares a guide or a plan, it lands here.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Resources" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("says her resources did not load, without the page header", async () => {
    // arrange
    listing = { status: "unavailable" };

    // act
    await renderResourcesPage();

    // assert
    expect(screen.getByRole("heading", { level: 1 })).toHaveAccessibleName(
      "Resources didn’t load",
    );
    expect(
      screen.queryByRole("heading", { name: "Resources" }),
    ).not.toBeInTheDocument();
  });

  it("loads her resources again when she tries again", async () => {
    // arrange
    listing = { status: "unavailable" };
    const user = await renderResourcesPage();
    listing = { status: "ready", resources: [...LIBRARY] };

    // act
    await user.click(screen.getByRole("button", { name: "Try again" }));

    // assert
    expect(
      await screen.findByRole("heading", { level: 1, name: "Resources" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Glute activation warm-up" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Resources didn’t load")).not.toBeInTheDocument();
  });
});

describe("opening a resource", () => {
  it("records that she opened it and leaves it unmarked once she closes it", async () => {
    // arrange
    const marks = stampMarks();
    const user = await renderResourcesPage();

    // act
    const viewer = await openResource(user, "Glute activation warm-up");
    await user.click(within(viewer).getByRole("button", { name: "Close" }));

    // assert
    await waitFor(() => {
      expect(marks).toEqual([WARM_UP.id]);
    });
    expect(
      screen.getByRole("button", { name: "Glute activation warm-up" }),
    ).toHaveAccessibleDescription("PDF 3 pages");
    await waitFor(() => {
      expect(listedAsOpened(WARM_UP.id)).toBe(true);
    });
    expect(
      screen.getByRole("button", { name: "Glute activation warm-up" }),
    ).toHaveAccessibleDescription("PDF 3 pages");
  });

  it("takes the mark off while the record is still on its way", async () => {
    // arrange
    const held = holdMarks();
    const user = await renderResourcesPage();

    // act
    const viewer = await openResource(user, "Glute activation warm-up");
    await user.click(within(viewer).getByRole("button", { name: "Close" }));

    // assert
    await waitFor(() => {
      expect(held).toHaveLength(1);
    });
    expect(
      screen.getByRole("button", { name: "Glute activation warm-up" }),
    ).toHaveAccessibleDescription("PDF 3 pages");
  });

  it("records nothing for a resource she has already opened", async () => {
    // arrange
    const marks = stampMarks();
    const user = await renderResourcesPage();

    // act
    const viewer = await openResource(user, "Plate portions guide");
    await user.click(within(viewer).getByRole("button", { name: "Close" }));

    // assert
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(marks).toEqual([]);
  });

  it("keeps the record of an earlier opening going when she opens another", async () => {
    // arrange
    const held = holdMarks();
    const user = await renderResourcesPage();
    const firstViewer = await openResource(user, "Glute activation warm-up");
    await user.click(
      within(firstViewer).getByRole("button", { name: "Close" }),
    );
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    // act
    const secondViewer = await openResource(user, "Food diary template");
    await user.click(
      within(secondViewer).getByRole("button", { name: "Close" }),
    );
    await waitFor(() => {
      expect(held).toHaveLength(2);
    });
    held.forEach((mark) => mark.release());

    // assert
    await waitFor(() => {
      expect(listedAsOpened(WARM_UP.id)).toBe(true);
      expect(listedAsOpened(FOOD_DIARY.id)).toBe(true);
    });
    expect(held.map(({ resourceId }) => resourceId)).toEqual([
      WARM_UP.id,
      FOOD_DIARY.id,
    ]);
    expect(held.some(({ request }) => request.signal.aborted)).toBe(false);
    const grid = screen.getByRole("region", { name: "Resources" });
    expect(within(grid).queryByText("New")).not.toBeInTheDocument();
  });

  it.each([
    {
      failure: "the server answers with an error",
      answer: () => new HttpResponse(null, { status: 500 }),
    },
    {
      failure: "the record never reaches the server",
      answer: () => HttpResponse.error(),
    },
  ])(
    "lets her page and download as usual and marks it new again after she closes it when $failure",
    async ({ answer }) => {
      // arrange
      server.use(http.post(OPENED_URL, answer));
      const user = await renderResourcesPage();
      const viewer = await openResource(user, "Glute activation warm-up");

      // act
      await user.click(
        within(viewer).getByRole("button", { name: "Next page" }),
      );

      // assert
      expect(within(viewer).getByText("2 / 3")).toBeVisible();
      expect(
        within(viewer).getByRole("link", { name: "Download" }),
      ).toHaveAttribute("href", `/api/client-resources/${WARM_UP.id}/download`);

      // act
      await user.click(within(viewer).getByRole("button", { name: "Close" }));

      // assert
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Glute activation warm-up" }),
        ).toHaveAccessibleDescription("PDF 3 pages New");
      });
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    },
  );

  it("shows a Word file as its cover with the name it downloads under", async () => {
    // arrange
    stampMarks();
    const user = await renderResourcesPage();

    // act
    const viewer = await openResource(user, "Food diary template");

    // assert
    expect(within(viewer).getByText("food-diary-template.docx")).toBeVisible();
    expect(within(viewer).queryByRole("img")).not.toBeInTheDocument();
    const download = within(viewer).getByRole("link", { name: "Download" });
    expect(download).toHaveAttribute(
      "href",
      `/api/client-resources/${FOOD_DIARY.id}/download`,
    );
    expect(download).toHaveAttribute("download", "food-diary-template.docx");
  });

  it("hands focus back to the card that opened it when it closes", async () => {
    // arrange
    stampMarks();
    const user = await renderResourcesPage();
    const viewer = await openResource(user, "Glute activation warm-up");

    // act
    await user.click(within(viewer).getByRole("button", { name: "Close" }));

    // assert
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: "Glute activation warm-up" }),
    ).toHaveFocus();
  });
});

function stampOpened(resourceId: string) {
  if (listing.status !== "ready") return;

  listing = {
    status: "ready",
    resources: listing.resources.map((resource) =>
      resource.id === resourceId && resource.openedAt === null
        ? { ...resource, openedAt: STAMPED_AT }
        : resource,
    ),
  };
}

function listedAsOpened(resourceId: string): boolean {
  return (
    listing.status === "ready" &&
    listing.resources.some(
      (resource) => resource.id === resourceId && resource.openedAt !== null,
    )
  );
}

function stampMarks(): string[] {
  const marks: string[] = [];
  server.use(
    http.post(OPENED_URL, ({ params }) => {
      const resourceId = String(params.resourceId);
      marks.push(resourceId);
      stampOpened(resourceId);

      return HttpResponse.json({ status: "opened" });
    }),
  );

  return marks;
}

function holdMarks(): HeldMark[] {
  const held: HeldMark[] = [];
  server.use(
    http.post(OPENED_URL, async ({ params, request }) => {
      const resourceId = String(params.resourceId);
      await new Promise<void>((release) => {
        held.push({ resourceId, request, release });
      });
      stampOpened(resourceId);

      return HttpResponse.json({ status: "opened" });
    }),
  );

  return held;
}

async function openResource(
  user: ReturnType<typeof userEvent.setup>,
  title: string,
) {
  await user.click(screen.getByRole("button", { name: title }));

  return screen.findByRole("dialog", { name: title });
}

async function renderResourcesPage() {
  const user = userEvent.setup();
  const router = createMemoryRouter(
    [
      {
        Component: ClientResourcesRoute,
        loader: () => listing,
        path: CLIENT_RESOURCES_PATH,
      },
      {
        action: frameworkModeAction(markOpened),
        path: OPENED_URL,
      },
    ],
    { initialEntries: [CLIENT_RESOURCES_PATH] },
  );

  render(
    <MotionConfig reducedMotion="always">
      <RouterProvider router={router} />
    </MotionConfig>,
  );
  await screen.findByRole("heading", { level: 1 });

  return user;
}
