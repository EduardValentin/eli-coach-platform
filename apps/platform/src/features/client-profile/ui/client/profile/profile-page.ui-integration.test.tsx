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

import type {
  MeasurementRow,
  MeasurementsPage,
} from "~/features/client-profile/public/measurements";
import {
  CLIENT_PROFILE_API_PATHS,
  CLIENT_PROFILE_PATH,
} from "~/features/client-profile/public/paths";
import { clientAction as recordMeasurements } from "~/features/client-profile/api/client/measurements";
import { clientAction as removePhoto } from "~/features/client-profile/api/photos/progress-photo";
import { frameworkModeAction } from "~/server/test-support/framework-mode-action";

import ClientProfileRoute from "./profile-page";

type MeasurementPhoto = MeasurementRow["photos"][number];

type RecordedSubmission = {
  entry: unknown;
  photoConsent: string | null;
  photoParts: string[];
};

const METRIC = { weightUnit: "kg", heightUnit: "cm" } as const;
const IMPERIAL = { weightUnit: "lb", heightUnit: "ft-in" } as const;

const CONSENT_STATEMENT =
  "I agree to share progress photos with my coach. They are only used to follow my progress, and I can ask for them to be deleted at any time.";

const FRONT: MeasurementPhoto = {
  id: "0f1e2d3c-4b5a-4968-8776-655443322110",
  view: "front",
};

const BACK: MeasurementPhoto = {
  id: "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
  view: "back",
};

const LATEST: MeasurementRow = {
  id: "8a7b6c5d-4e3f-4a1b-9c8d-7e6f5a4b3c2d",
  recordedAt: "2026-09-29T08:00:00.000Z",
  weightKg: 66.1,
  waistCm: 74,
  hipsCm: 98,
  thighCm: null,
  armCm: 28,
  photos: [FRONT, BACK],
};

const EARLIER: MeasurementRow = {
  id: "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e",
  recordedAt: "2026-09-01T08:00:00.000Z",
  weightKg: 67.4,
  waistCm: 76,
  hipsCm: null,
  thighCm: null,
  armCm: null,
  photos: [],
};

const SAVED_ENTRY_ID = "3c4d5e6f-7a8b-4c9d-8e0f-2a3b4c5d6e7f";

const MEASUREMENTS_URL = CLIENT_PROFILE_API_PATHS.measurements;
const PHOTO_URL = `${CLIENT_PROFILE_API_PATHS.photos}/:photoId`;

const server = setupServer();

let storedPage: MeasurementsPage;

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  clientIsIn("Europe/Bucharest");
  previewsAreAvailable();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  vi.restoreAllMocks();
});

afterAll(() => {
  server.close();
});

describe("the client profile page", () => {
  it("heads the page with her profile and its one top-level heading", async () => {
    // arrange, act
    await renderProfile(pageWith());

    // assert
    expect(
      screen
        .getAllByRole("heading", { level: 1 })
        .map(({ textContent }) => textContent),
    ).toEqual(["Your Profile"]);
    expect(
      screen.getByText(
        "Your coach keeps this up to date. Mention any changes at your next check-in.",
      ),
    ).toBeInTheDocument();
  });

  it("lists her entries newest first in her units, with a dash for a skipped value and no ratio", async () => {
    // arrange, act
    await renderProfile(pageWith());

    // assert
    const table = screen.getByRole("table", {
      name: "Measurements history, newest first",
    });
    const [header, latest, earlier] = within(table).getAllByRole("row");

    expect(
      within(header!)
        .getAllByRole("columnheader")
        .map(({ textContent }) => textContent),
    ).toEqual(["Date", "Weight", "Waist", "Hips", "Thigh", "Arm", "Actions"]);
    expect(cellsOf(latest!)).toEqual([
      "29 September",
      "66.1 kg",
      "74 cm",
      "98 cm",
      "—",
      "28 cm",
      "View photos",
    ]);
    expect(cellsOf(earlier!)).toEqual([
      "1 September",
      "67.4 kg",
      "76 cm",
      "—",
      "—",
      "—",
      "",
    ]);
  });

  it("invites her first measurements while she has none", async () => {
    // arrange, act
    await renderProfile(pageWith({ history: [] }));

    // assert
    expect(
      screen.getByText(
        "Nothing recorded yet. Your first set goes in with your answers.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add your first measurements" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add" }),
    ).not.toBeInTheDocument();
  });
});

describe("the add measurements sheet", () => {
  it("opens from Add prefilled with her latest values", async () => {
    // arrange
    const user = await renderProfile(pageWith());

    // act
    await user.click(screen.getByRole("button", { name: "Add" }));

    // assert
    const sheet = screen.getByRole("dialog", {
      description:
        "Same time of day, same tape, same spots — that is what keeps them comparable.",
      name: "Add measurements",
    });
    expect(
      within(sheet).getByRole("heading", {
        level: 3,
        name: "Add measurements",
      }),
    ).toBeInTheDocument();
    expect(readingOf(sheet, /^Weight/)).toHaveValue(66.1);
    expect(readingOf(sheet, /^Waist/)).toHaveValue(74);
    expect(readingOf(sheet, /^Hips/)).toHaveValue(98);
    expect(readingOf(sheet, /^Thigh/)).toHaveValue(null);
    expect(readingOf(sheet, /^Arm/)).toHaveValue(28);
  });

  it("opens empty for her first measurements", async () => {
    // arrange
    const user = await renderProfile(pageWith({ history: [] }));

    // act
    await user.click(
      screen.getByRole("button", { name: "Add your first measurements" }),
    );

    // assert
    const sheet = screen.getByRole("dialog", { name: "Add measurements" });
    expect(readingOf(sheet, /^Weight/)).toHaveValue(null);
    expect(readingOf(sheet, /^Waist/)).toHaveValue(null);
  });

  it("prefills her latest values in pounds and inches when she measures that way", async () => {
    // arrange
    const user = await renderProfile(pageWith({ units: IMPERIAL }));

    // act
    await user.click(screen.getByRole("button", { name: "Add" }));

    // assert
    const sheet = screen.getByRole("dialog", { name: "Add measurements" });
    expect(readingOf(sheet, /^Weight\s*\(lb\)/)).toHaveValue(145.7);
    expect(readingOf(sheet, /^Waist\s*\(in\)/)).toHaveValue(29.25);
  });

  it("asks for a missing weight and turns down a waist outside the range in her units", async () => {
    // arrange
    const user = await openSheet(pageWith({ units: IMPERIAL }));
    const sheet = screen.getByRole("dialog", { name: "Add measurements" });

    // act
    await user.clear(readingOf(sheet, /^Weight/));
    await user.clear(readingOf(sheet, /^Waist/));
    await user.type(readingOf(sheet, /^Waist/), "90");
    await user.click(
      within(sheet).getByRole("button", { name: "Save measurements" }),
    );

    // assert
    expect(within(sheet).getByText("Enter a weight.")).toBeVisible();
    expect(
      within(sheet).getByText("Enter a measurement between 16 and 79 in."),
    ).toBeVisible();
  });

  it("closes on Cancel and starts again from her latest values when reopened", async () => {
    // arrange
    const user = await openSheet(pageWith());
    const sheet = screen.getByRole("dialog", { name: "Add measurements" });
    await user.clear(readingOf(sheet, /^Weight/));
    await user.type(readingOf(sheet, /^Weight/), "70");

    // act
    await user.click(within(sheet).getByRole("button", { name: "Cancel" }));
    await user.click(screen.getByRole("button", { name: "Add" }));

    // assert
    expect(
      readingOf(
        screen.getByRole("dialog", { name: "Add measurements" }),
        /^Weight/,
      ),
    ).toHaveValue(66.1);
  });

  it("keeps the photo tiles locked until she agrees to share photos", async () => {
    // arrange
    const user = await openSheet(pageWith());
    const sheet = screen.getByRole("dialog", { name: "Add measurements" });
    const tiles = within(sheet).getByRole("group", { name: "Progress photos" });

    // assert
    expect(tiles).toHaveAccessibleDescription(
      "Tick the box to add your photos.",
    );
    expect(within(sheet).getByLabelText("Add front photo")).toBeDisabled();
    expect(within(sheet).getByLabelText("Add side photo")).toBeDisabled();
    expect(within(sheet).getByLabelText("Add back photo")).toBeDisabled();

    // act
    await user.click(
      within(sheet).getByRole("checkbox", { name: CONSENT_STATEMENT }),
    );

    // assert
    expect(within(sheet).getByLabelText("Add front photo")).toBeEnabled();
    expect(
      within(sheet).queryByText("Tick the box to add your photos."),
    ).not.toBeInTheDocument();
  });

  it("offers only JPEG, PNG and WebP from the picker", async () => {
    // arrange
    await openSheet(pageWith({ consentedAt: "2026-09-27T09:00:00.000Z" }));

    // assert
    expect(screen.getByLabelText("Add side photo")).toHaveAttribute(
      "accept",
      "image/jpeg,image/png,image/webp",
    );
  });

  it("opens the tiles without asking again once she has consented", async () => {
    // arrange, act
    await openSheet(pageWith({ consentedAt: "2026-09-27T09:00:00.000Z" }));

    // assert
    const sheet = screen.getByRole("dialog", { name: "Add measurements" });
    expect(within(sheet).queryByRole("checkbox")).not.toBeInTheDocument();
    expect(within(sheet).getByLabelText("Add back photo")).toBeEnabled();
  });

  it("previews a photo she picks and lets her remove it before saving", async () => {
    // arrange
    const user = await openSheet(
      pageWith({ consentedAt: "2026-09-27T09:00:00.000Z" }),
    );
    const sheet = screen.getByRole("dialog", { name: "Add measurements" });

    // act
    await user.upload(within(sheet).getByLabelText("Add front photo"), photo());

    // assert
    expect(
      within(sheet).getByRole("img", { name: "Front photo" }),
    ).toHaveAttribute("src", "blob:front.png");

    // act
    await user.click(
      within(sheet).getByRole("button", { name: "Remove front photo" }),
    );

    // assert
    expect(
      within(sheet).queryByRole("img", { name: "Front photo" }),
    ).not.toBeInTheDocument();
    expect(within(sheet).getByLabelText("Add front photo")).toBeEnabled();
  });

  it("refuses a file that is not a photo", async () => {
    // arrange
    const user = await openSheet(
      pageWith({ consentedAt: "2026-09-27T09:00:00.000Z" }),
      { applyAccept: false },
    );

    // act
    await user.upload(
      screen.getByLabelText("Add side photo"),
      new File(["notes"], "notes.txt", { type: "text/plain" }),
    );

    // assert
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Choose a JPEG, PNG or WebP under 10 MB.",
    );
    expect(
      screen.queryByRole("img", { name: "Side photo" }),
    ).not.toBeInTheDocument();
  });

  it("refuses a photo over 10 MB and clears the message once she picks a good one", async () => {
    // arrange
    const user = await openSheet(
      pageWith({ consentedAt: "2026-09-27T09:00:00.000Z" }),
    );

    // act
    await user.upload(
      screen.getByLabelText("Add back photo"),
      photo({ name: "back.png", sizeBytes: 10 * 1024 * 1024 + 1 }),
    );

    // assert
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Choose a JPEG, PNG or WebP under 10 MB.",
    );

    // act
    await user.upload(
      screen.getByLabelText("Add back photo"),
      photo({ name: "back.png" }),
    );

    // assert
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Back photo" })).toBeInTheDocument();
  });

  it("saves a new entry in canonical units with the consent she gives now, then names each photo that could not be processed", async () => {
    // arrange
    const submissions = recordSubmissions({ back: "refused", front: "stored" });
    const user = await openSheet(pageWith());
    const sheet = screen.getByRole("dialog", { name: "Add measurements" });
    await user.clear(readingOf(sheet, /^Weight/));
    await user.type(readingOf(sheet, /^Weight/), "65.8");
    await user.click(
      within(sheet).getByRole("checkbox", { name: CONSENT_STATEMENT }),
    );
    await user.upload(within(sheet).getByLabelText("Add front photo"), photo());
    await user.upload(
      within(sheet).getByLabelText("Add back photo"),
      photo({ name: "back.png" }),
    );

    // act
    await user.click(
      within(sheet).getByRole("button", { name: "Save measurements" }),
    );

    // assert
    expect(await screen.findByText("Measurements saved.")).toBeInTheDocument();
    expect(
      await screen.findByText(
        "The back photo could not be processed, so it was not saved.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        "The front photo could not be processed, so it was not saved.",
      ),
    ).not.toBeInTheDocument();
    expect(submissions).toEqual([
      {
        entry: { weightKg: 65.8, waistCm: 74, hipsCm: 98, armCm: 28 },
        photoConsent: "given",
        photoParts: ["front", "back"],
      },
    ]);
    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Add measurements" }),
      ).not.toBeInTheDocument();
    });
    expect(
      await screen.findByRole("cell", { name: "1 October" }),
    ).toBeInTheDocument();
  });

  it("saves pounds and inches as kilograms and centimetres", async () => {
    // arrange
    const submissions = recordSubmissions({});
    const user = await openSheet(pageWith({ history: [], units: IMPERIAL }));
    const sheet = screen.getByRole("dialog", { name: "Add measurements" });
    await user.type(readingOf(sheet, /^Weight/), "145.7");
    await user.type(readingOf(sheet, /^Waist/), "29.25");

    // act
    await user.click(
      within(sheet).getByRole("button", { name: "Save measurements" }),
    );

    // assert
    expect(await screen.findByText("Measurements saved.")).toBeInTheDocument();
    expect(submissions).toEqual([
      {
        entry: { weightKg: 66.09, waistCm: 74.5 },
        photoConsent: null,
        photoParts: [],
      },
    ]);
  });

  it("sends her photos without asking for consent again once she has agreed", async () => {
    // arrange
    const submissions = recordSubmissions({ side: "stored" });
    const user = await openSheet(
      pageWith({ consentedAt: "2026-09-27T09:00:00.000Z" }),
    );
    const sheet = screen.getByRole("dialog", { name: "Add measurements" });
    await user.upload(
      within(sheet).getByLabelText("Add side photo"),
      photo({ name: "side.png" }),
    );

    // act
    await user.click(
      within(sheet).getByRole("button", { name: "Save measurements" }),
    );

    // assert
    expect(await screen.findByText("Measurements saved.")).toBeInTheDocument();
    expect(submissions).toEqual([
      {
        entry: { weightKg: 66.1, waistCm: 74, hipsCm: 98, armCm: 28 },
        photoConsent: null,
        photoParts: ["side"],
      },
    ]);
  });

  it.each([
    {
      failure: "the server answers with an error",
      answer: () => new HttpResponse(null, { status: 500 }),
    },
    {
      failure: "her session has ended",
      answer: () => new HttpResponse("Unauthorized", { status: 401 }),
    },
    {
      failure: "the request never reaches the server",
      answer: () => HttpResponse.error(),
    },
  ])(
    "keeps the sheet open with what she entered and tells her the save failed when $failure",
    async ({ answer }) => {
      // arrange
      server.use(http.post(MEASUREMENTS_URL, answer));
      const user = await openSheet(
        pageWith({ consentedAt: "2026-09-27T09:00:00.000Z" }),
      );
      const sheet = screen.getByRole("dialog", { name: "Add measurements" });
      await user.clear(readingOf(sheet, /^Weight/));
      await user.type(readingOf(sheet, /^Weight/), "65.8");
      await user.upload(
        within(sheet).getByLabelText("Add front photo"),
        photo(),
      );

      // act
      await user.click(
        within(sheet).getByRole("button", { name: "Save measurements" }),
      );

      // assert
      expect(
        await screen.findByText(
          "Your measurements could not be saved. Try again.",
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("dialog", { name: "Add measurements" }),
      ).toBeInTheDocument();
      expect(readingOf(sheet, /^Weight/)).toHaveValue(65.8);
      expect(
        within(sheet).getByRole("img", { name: "Front photo" }),
      ).toBeInTheDocument();
      expect(
        within(sheet).getByRole("button", { name: "Save measurements" }),
      ).toBeEnabled();
    },
  );
});

describe("the photo view", () => {
  it("opens an entry's photos and removes one after she confirms", async () => {
    // arrange
    const removals = recordRemovals();
    const user = await renderProfile(pageWith());
    await user.click(
      screen.getByRole("button", { name: "View photos from 29 September" }),
    );
    const photos = screen.getByRole("dialog", {
      name: "Photos from 29 September",
    });

    // act
    await user.click(
      within(photos).getByRole("button", { name: "Remove front photo" }),
    );
    await user.click(
      within(
        screen.getByRole("dialog", { name: "Remove this photo?" }),
      ).getByRole("button", { name: "Remove" }),
    );

    // assert
    expect(removals).toEqual([FRONT.id]);
    expect(await within(photos).findByText("No front photo")).toBeVisible();
    expect(
      within(photos).getByRole("img", { name: "Back photo" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("The photo could not be removed. Try again."),
    ).not.toBeInTheDocument();
  });

  it("drops the row action once she removes the entry's last photo while the view stays open", async () => {
    // arrange
    recordRemovals();
    const user = await renderProfile(
      pageWith({ history: [{ ...LATEST, photos: [BACK] }, EARLIER] }),
    );
    await user.click(
      screen.getByRole("button", { name: "View photos from 29 September" }),
    );
    const photos = screen.getByRole("dialog", {
      name: "Photos from 29 September",
    });

    // act
    await user.click(
      within(photos).getByRole("button", { name: "Remove back photo" }),
    );
    await user.click(
      within(
        screen.getByRole("dialog", { name: "Remove this photo?" }),
      ).getByRole("button", { name: "Remove" }),
    );

    // assert
    expect(await within(photos).findByText("No back photo")).toBeVisible();
    expect(
      screen.getByRole("dialog", { name: "Photos from 29 September" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "View photos from 29 September" }),
    ).not.toBeInTheDocument();
  });

  it.each([
    {
      failure: "the server answers with an error",
      answer: () => new HttpResponse(null, { status: 500 }),
    },
    {
      failure: "the server refuses it",
      answer: () => new HttpResponse("Not Found", { status: 404 }),
    },
    {
      failure: "the request never reaches the server",
      answer: () => HttpResponse.error(),
    },
  ])(
    "keeps the photo and tells her it could not be removed when $failure",
    async ({ answer }) => {
      // arrange
      server.use(http.delete(PHOTO_URL, answer));
      const user = await renderProfile(pageWith());
      await user.click(
        screen.getByRole("button", { name: "View photos from 29 September" }),
      );
      const photos = screen.getByRole("dialog", {
        name: "Photos from 29 September",
      });

      // act
      await user.click(
        within(photos).getByRole("button", { name: "Remove front photo" }),
      );
      await user.click(
        within(
          screen.getByRole("dialog", { name: "Remove this photo?" }),
        ).getByRole("button", { name: "Remove" }),
      );

      // assert
      expect(
        await screen.findByText("The photo could not be removed. Try again."),
      ).toBeVisible();
      await waitFor(() => {
        expect(
          screen.queryByRole("dialog", { name: "Remove this photo?" }),
        ).not.toBeInTheDocument();
      });
      expect(
        within(photos).getByRole("img", { name: "Front photo" }),
      ).toBeInTheDocument();
      expect(
        within(photos).getByRole("button", { name: "Remove front photo" }),
      ).toBeVisible();
    },
  );
});

function pageWith(overrides: Partial<MeasurementsPage> = {}): MeasurementsPage {
  return {
    history: [LATEST, EARLIER],
    consentedAt: null,
    units: METRIC,
    dueLine: null,
    ...overrides,
  };
}

async function renderProfile(
  page: MeasurementsPage,
  options: { applyAccept?: boolean } = {},
) {
  storedPage = page;
  const user = userEvent.setup({ applyAccept: options.applyAccept ?? true });
  const router = createMemoryRouter(
    [
      {
        Component: ClientProfileRoute,
        loader: () => storedPage,
        path: CLIENT_PROFILE_PATH,
      },
      {
        action: frameworkModeAction(recordMeasurements),
        path: MEASUREMENTS_URL,
      },
      { action: frameworkModeAction(removePhoto), path: PHOTO_URL },
    ],
    { initialEntries: [CLIENT_PROFILE_PATH] },
  );

  render(
    <MotionConfig reducedMotion="always">
      <RouterProvider router={router} />
      <Toaster />
    </MotionConfig>,
  );
  await screen.findByRole("heading", { level: 1, name: "Your Profile" });

  return user;
}

async function openSheet(
  page: MeasurementsPage,
  options: { applyAccept?: boolean } = {},
) {
  const user = await renderProfile(page, options);
  const opener =
    page.history.length > 0
      ? screen.getByRole("button", { name: "Add" })
      : screen.getByRole("button", { name: "Add your first measurements" });

  await user.click(opener);

  return user;
}

function readingOf(sheet: HTMLElement, name: RegExp): HTMLElement {
  return within(sheet).getByRole("spinbutton", { name });
}

function cellsOf(row: HTMLElement): string[] {
  return within(row)
    .getAllByRole("cell")
    .map(({ textContent }) => textContent ?? "");
}

function photo(options: { name?: string; sizeBytes?: number } = {}): File {
  return new File(
    [new Uint8Array(options.sizeBytes ?? 64)],
    options.name ?? "front.png",
    { type: "image/png" },
  );
}

function readSubmission(body: string): RecordedSubmission {
  const entry = /name="entry"\r\n\r\n([^\r]*)\r\n--/.exec(body)?.[1];
  const photoConsent =
    /name="photoConsent"\r\n\r\n([^\r]*)\r\n--/.exec(body)?.[1] ?? null;
  const photoParts = [
    ...body.matchAll(/name="(front|side|back)"; filename=/g),
  ].map((match) => match[1] ?? "");

  return {
    entry: entry === undefined ? null : JSON.parse(entry),
    photoConsent,
    photoParts,
  };
}

function recordSubmissions(
  outcomes: Partial<Record<MeasurementPhoto["view"], "stored" | "refused">>,
): RecordedSubmission[] {
  const submissions: RecordedSubmission[] = [];

  server.use(
    http.post(MEASUREMENTS_URL, async ({ request }) => {
      submissions.push(readSubmission(await request.text()));
      storedPage = {
        ...storedPage,
        history: [
          {
            ...LATEST,
            id: SAVED_ENTRY_ID,
            recordedAt: "2026-10-01T08:00:00.000Z",
            photos: [],
          },
          ...storedPage.history,
        ],
      };

      return HttpResponse.json(
        {
          entryId: SAVED_ENTRY_ID,
          photos: {
            front: outcomes.front ?? "absent",
            side: outcomes.side ?? "absent",
            back: outcomes.back ?? "absent",
          },
        },
        { status: 201 },
      );
    }),
  );

  return submissions;
}

function recordRemovals(): string[] {
  const removals: string[] = [];

  server.use(
    http.delete(PHOTO_URL, ({ params }) => {
      const photoId = String(params.photoId);
      removals.push(photoId);
      storedPage = {
        ...storedPage,
        history: storedPage.history.map((row) => ({
          ...row,
          photos: row.photos.filter((candidate) => candidate.id !== photoId),
        })),
      };

      return new HttpResponse(null, { status: 204 });
    }),
  );

  return removals;
}

function clientIsIn(timeZone: string) {
  const actual = new Intl.DateTimeFormat().resolvedOptions();

  vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
    ...actual,
    timeZone,
  });
}

function previewsAreAvailable() {
  vi.spyOn(URL, "createObjectURL").mockImplementation(
    (photo) => `blob:${(photo as File).name}`,
  );
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
}
