import {
  excelWorkbook,
  macroProjectWordDocument,
  oldExcelWorkbook,
  oldPowerPointPresentation,
  oldWordDocument,
  openDocumentSpreadsheet,
  openDocumentText,
  paddedPdfOfLength,
  passwordProtectedPdf,
  pdfWithPages,
  plainText,
  powerPointPresentation,
  truncatedPdf,
  windowsProgram,
  wordDocument,
} from "@eli-coach-platform/test-support/sample-documents";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { ApiIntegrationTestSuite } from "~integration-test-config/api-integration-test-suite";
import { ClientOnboardingJourney } from "~integration-test-config/client-onboarding-journey";
import {
  ClientResourcesJourney,
  VISITOR,
  type AddedResource,
  type ResourceUpload,
} from "~integration-test-config/client-resources-journey";
import {
  ANA,
  CALL_ENDED_INSTANT,
  CoachingSalesJourney,
  SECOND_PURCHASE,
  type Visitor,
} from "~integration-test-config/coaching-sales-journey";
import {
  COACH_SESSION,
  PlatformRig,
  type AccountSession,
} from "~integration-test-config/platform-rig";
import {
  textNodesOf,
  visibleDocument,
} from "~integration-test-config/rendered-page";
import {
  cameraJpegWithOrientationAndLocation,
  imageFactsOf,
} from "~integration-test-config/sample-images";
import {
  stripeSubscriptionObject,
  SubscriptionLifecycleJourney,
} from "~integration-test-config/subscription-lifecycle-journey";
import { toUnixSeconds } from "~integration-test-config/wire-mock/expectations/stripe-api";

const suite = new ApiIntegrationTestSuite();
const rig = new PlatformRig(suite);
const sales = new CoachingSalesJourney(rig);
const onboarding = new ClientOnboardingJourney(rig, sales);
const resources = new ClientResourcesJourney(rig);
const lifecycle = new SubscriptionLifecycleJourney(rig);

const ANA_SESSION: AccountSession = {
  sessionId: "sess_resources_ana",
  subjectId: "user_resources_ana",
};

const MARIA_SESSION: AccountSession = {
  sessionId: "sess_resources_maria",
  subjectId: "user_resources_maria",
};

const MARIA: Visitor = {
  email: "maria.resources@example.com",
  firstName: "Maria",
  gender: "female",
  lastName: "Ionescu",
};

const MEGABYTE = 1024 * 1024;
const MAX_FILE_BYTES = 25 * MEGABYTE;
const BODY_CAP_BYTES = 26 * MEGABYTE;
const PAGE_LONG_EDGE = 1600;
const THUMBNAIL_LONG_EDGE = 480;
const MINUTE_IN_MILLISECONDS = 60 * 1000;
const FIRST_ADDED = new Date(
  CALL_ENDED_INSTANT.getTime() + 60 * MINUTE_IN_MILLISECONDS,
);
const SECOND_ADDED = new Date(FIRST_ADDED.getTime() + MINUTE_IN_MILLISECONDS);
const THIRD_ADDED = new Date(SECOND_ADDED.getTime() + MINUTE_IN_MILLISECONDS);
const UNKNOWN_ID = "9e8d7c6b-5a49-4382-9716-a5b4c3d2e1f0";
const NOT_A_UUID = "not-a-resource-id";
const NON_ASCII_NAME = "Plan alimentar – săptămâna 1.pdf";
const CLIENT_PORTAL = "/client";
const WELCOME = "/client/welcome";
const ENDED_PAGE = "/client/ended";
const FIRST_OPENED = new Date(
  CALL_ENDED_INSTANT.getTime() + 2 * 60 * MINUTE_IN_MILLISECONDS,
);
const OPENED_AGAIN = new Date(
  FIRST_OPENED.getTime() + 24 * 60 * MINUTE_IN_MILLISECONDS,
);

type ClientWithPdf = {
  clientId: string;
  pdf: Buffer;
  resource: AddedResource;
};

type OfficeOrImageCase = {
  name: string;
  fileName: string;
  bytes: () => Promise<Uint8Array> | Uint8Array;
  kind: AddedResource["file"]["kind"];
  format: string;
  mimeType: string;
  pageCount: number | null;
  storedFiles: string[];
};

const GLUTE_WARM_UP = "Glute warm-up";
const MEAL_PLAN = "Meal plan 50% carbs";
const BATCH_COOKING = "Batch cooking";
const LIBRARY_TITLES = [GLUTE_WARM_UP, MEAL_PLAN, BATCH_COOKING];

type TaggedLibrary = { clientId: string; warmUp: AddedResource };

const ORIGINAL_ONLY = ["original"];
const ONE_PAGE_FILES = ["original", "page-1", "thumbnail"];

const OFFICE_AND_IMAGE_CASES: OfficeOrImageCase[] = [
  {
    name: "a JPEG photo",
    fileName: "posture.jpg",
    bytes: cameraJpegWithOrientationAndLocation,
    kind: "image",
    format: "jpeg",
    mimeType: "image/jpeg",
    pageCount: 1,
    storedFiles: ONE_PAGE_FILES,
  },
  {
    name: "a Word document",
    fileName: "Training notes.docx",
    bytes: wordDocument,
    kind: "word",
    format: "docx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    pageCount: null,
    storedFiles: ORIGINAL_ONLY,
  },
  {
    name: "an old Word document",
    fileName: "Training notes.doc",
    bytes: oldWordDocument,
    kind: "word",
    format: "doc",
    mimeType: "application/msword",
    pageCount: null,
    storedFiles: ORIGINAL_ONLY,
  },
  {
    name: "an OpenDocument text",
    fileName: "Training notes.odt",
    bytes: openDocumentText,
    kind: "word",
    format: "odt",
    mimeType: "application/vnd.oasis.opendocument.text",
    pageCount: null,
    storedFiles: ORIGINAL_ONLY,
  },
  {
    name: "an Excel workbook",
    fileName: "Macros.xlsx",
    bytes: excelWorkbook,
    kind: "excel",
    format: "xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    pageCount: null,
    storedFiles: ORIGINAL_ONLY,
  },
  {
    name: "an old Excel workbook",
    fileName: "Macros.xls",
    bytes: oldExcelWorkbook,
    kind: "excel",
    format: "xls",
    mimeType: "application/vnd.ms-excel",
    pageCount: null,
    storedFiles: ORIGINAL_ONLY,
  },
  {
    name: "an OpenDocument spreadsheet",
    fileName: "Macros.ods",
    bytes: openDocumentSpreadsheet,
    kind: "excel",
    format: "ods",
    mimeType: "application/vnd.oasis.opendocument.spreadsheet",
    pageCount: null,
    storedFiles: ORIGINAL_ONLY,
  },
];

describe.sequential("client resources integration", () => {
  beforeAll(async () => {
    process.env.BOOTSTRAP_COACH_AUTH_SUBJECT_ID = COACH_SESSION.subjectId;
    await suite.start();
  });

  beforeEach(async () => {
    await rig.switchWaitlistModeOff();
    await rig.provisionCoach();
  });

  afterEach(async () => {
    rig.releaseClock();
    await suite.reset();
  });

  afterAll(async () => {
    await suite.stop();
    delete process.env.BOOTSTRAP_COACH_AUTH_SUBJECT_ID;
  });

  describe("adding a resource", () => {
    it("adds a PDF with a page image for every page and a thumbnail, and keeps the original unchanged", async () => {
      // arrange
      const clientId = await admitAna();
      const pdf = await pdfWithPages(3);
      await rig.holdClock(FIRST_ADDED);

      // act
      const response = await resources.upload(COACH_SESSION, clientId, {
        bytes: pdf,
        fileName: "Meal plan.pdf",
        title: "  Meal plan  ",
        description: "Week one",
      });

      // assert
      expect(response.status).toBe(201);
      const { resource } = (await response.json()) as {
        resource: AddedResource;
      };
      expect(resource).toEqual({
        id: expect.any(String),
        title: "Meal plan",
        description: "Week one",
        tags: [],
        file: {
          originalName: "Meal plan.pdf",
          downloadName: "Meal plan.pdf",
          kind: "pdf",
          sizeBytes: pdf.byteLength,
          pageCount: 3,
        },
        addedAt: FIRST_ADDED.toISOString(),
        openedAt: null,
      });
      expect(await resources.resourceRowsOf(clientId)).toEqual([
        {
          id: resource.id,
          title: "Meal plan",
          description: "Week one",
          tags: [],
          originalName: "Meal plan.pdf",
          format: "pdf",
          sizeBytes: pdf.byteLength,
          pageCount: 3,
          addedAt: FIRST_ADDED,
          openedAt: null,
        },
      ]);
      expect(await resources.storedFileNamesOf(clientId, resource.id)).toEqual([
        "original",
        "page-1",
        "page-2",
        "page-3",
        "thumbnail",
      ]);
      expect(
        await resources.storedFileOf(clientId, resource.id, "original"),
      ).toEqual(pdf);
    });

    it.each(OFFICE_AND_IMAGE_CASES)(
      "adds $name and hands its original back under its own type",
      async (sample) => {
        // arrange
        const clientId = await admitAna();
        const bytes = Buffer.from(await sample.bytes());

        // act
        const resource = await resources.uploadAccepted(
          COACH_SESSION,
          clientId,
          { bytes, fileName: sample.fileName },
        );
        const downloaded = await resources.download(COACH_SESSION, resource.id);

        // assert
        expect(resource.file).toEqual({
          originalName: sample.fileName,
          downloadName: sample.fileName,
          kind: sample.kind,
          sizeBytes: bytes.byteLength,
          pageCount: sample.pageCount,
        });
        expect(await resources.resourceRowsOf(clientId)).toEqual([
          expect.objectContaining({
            format: sample.format,
            pageCount: sample.pageCount,
          }),
        ]);
        expect(
          await resources.storedFileNamesOf(clientId, resource.id),
        ).toEqual(sample.storedFiles);
        expect(downloaded.status).toBe(200);
        expect(downloaded.headers.get("content-type")).toBe(sample.mimeType);
        expect(Buffer.from(await downloaded.arrayBuffer())).toEqual(bytes);
      },
    );

    it("records each resource at the moment it was added, the newest first", async () => {
      // arrange
      const clientId = await admitAna();
      await rig.holdClock(FIRST_ADDED);
      const first = await resources.uploadAccepted(COACH_SESSION, clientId, {
        bytes: await wordDocument(),
        fileName: "First.docx",
      });
      await rig.holdClock(SECOND_ADDED);

      // act
      const second = await resources.uploadAccepted(COACH_SESSION, clientId, {
        bytes: await excelWorkbook(),
        fileName: "Second.xlsx",
      });

      // assert
      expect(
        (await resources.resourceRowsOf(clientId)).map(({ id, addedAt }) => ({
          id,
          addedAt,
        })),
      ).toEqual([
        { id: second.id, addedAt: SECOND_ADDED },
        { id: first.id, addedAt: FIRST_ADDED },
      ]);
    });

    it("adds a resource to one client only", async () => {
      // arrange
      const anaId = await admitAna();
      const mariaId = await admitMaria();

      // act
      const resource = await resources.uploadAccepted(COACH_SESSION, anaId, {
        bytes: await wordDocument(),
        fileName: "For Ana.docx",
      });

      // assert
      expect(
        (await resources.resourceRowsOf(anaId)).map(({ id }) => id),
      ).toEqual([resource.id]);
      expect(await resources.resourceRowsOf(mariaId)).toEqual([]);
      expect(await resources.storedFileCountOf(mariaId)).toBe(0);
    });

    it("answers not found to a client who does not exist and keeps nothing", async () => {
      // arrange
      await admitAna();

      // act
      const response = await resources.upload(COACH_SESSION, UNKNOWN_ID, {
        bytes: await wordDocument(),
        fileName: "Lost.docx",
      });

      // assert
      expect(response.status).toBe(404);
      expect(await resources.storedFileCountOf(UNKNOWN_ID)).toBe(0);
    });

    it("answers not found to a client id that is not a uuid", async () => {
      // arrange, act
      const response = await resources.upload(COACH_SESSION, NOT_A_UUID, {
        bytes: await wordDocument(),
        fileName: "Lost.docx",
      });

      // assert
      expect(response.status).toBe(404);
    });
  });

  describe("refusing a file", () => {
    it.each([
      {
        name: "a program",
        fileName: "setup.exe",
        bytes: windowsProgram,
        refusal: "unsupported-type",
      },
      {
        name: "a PowerPoint presentation",
        fileName: "slides.pptx",
        bytes: powerPointPresentation,
        refusal: "unsupported-type",
      },
      {
        name: "an old PowerPoint presentation renamed as a Word file",
        fileName: "slides.doc",
        bytes: oldPowerPointPresentation,
        refusal: "unsupported-type",
      },
      {
        name: "a Word document carrying a macro project",
        fileName: "plan.docx",
        bytes: macroProjectWordDocument,
        refusal: "unsupported-type",
      },
      {
        name: "a text file renamed as a PDF",
        fileName: "plan.pdf",
        bytes: plainText,
        refusal: "unsupported-type",
      },
      {
        name: "a file over 25 MB",
        fileName: "big.pdf",
        bytes: () => paddedPdfOfLength(MAX_FILE_BYTES + 1),
        refusal: "too-large",
      },
      {
        name: "a PDF over 50 pages",
        fileName: "long.pdf",
        bytes: () => pdfWithPages(51),
        refusal: "too-many-pages",
      },
      {
        name: "a password-protected PDF",
        fileName: "locked.pdf",
        bytes: passwordProtectedPdf,
        refusal: "unreadable",
      },
      {
        name: "a damaged PDF",
        fileName: "damaged.pdf",
        bytes: truncatedPdf,
        refusal: "unreadable",
      },
    ])(
      "refuses $name with its reason and keeps nothing",
      async ({ fileName, bytes, refusal }) => {
        // arrange
        const clientId = await admitAna();

        // act
        const response = await resources.upload(COACH_SESSION, clientId, {
          bytes: await bytes(),
          fileName,
        });

        // assert
        expect(response.status).toBe(422);
        expect(await response.json()).toEqual({ refusal });
        expect(await resources.resourceRowsOf(clientId)).toEqual([]);
        expect(await resources.storedFileCountOf(clientId)).toBe(0);
      },
    );

    it("refuses a body over the upload cap as too large before reading it and keeps nothing", async () => {
      // arrange
      const clientId = await admitAna();

      // act
      const response = await resources.upload(COACH_SESSION, clientId, {
        bytes: paddedPdfOfLength(BODY_CAP_BYTES + 1),
        fileName: "huge.pdf",
      });

      // assert
      expect(response.status).toBe(413);
      expect(await response.json()).toEqual({ refusal: "too-large" });
      expect(await resources.resourceRowsOf(clientId)).toEqual([]);
      expect(await resources.storedFileCountOf(clientId)).toBe(0);
    });
  });

  describe("refusing the details", () => {
    it.each([
      {
        name: "a missing title",
        details: { title: "   " },
        problems: { title: "missing" },
      },
      {
        name: "a title over 120 characters",
        details: { title: "t".repeat(121) },
        problems: { title: "too-long" },
      },
      {
        name: "a description over 2,000 characters",
        details: { title: "Meal plan", description: "d".repeat(2_001) },
        problems: { description: "too-long" },
      },
      {
        name: "a tag over 30 characters",
        details: { title: "Meal plan", tags: ["Meals", "t".repeat(31)] },
        problems: { tags: "too-long" },
      },
    ])("refuses $name and keeps nothing", async ({ details, problems }) => {
      // arrange
      const clientId = await admitAna();

      // act
      const response = await resources.upload(COACH_SESSION, clientId, {
        bytes: await wordDocument(),
        fileName: "Notes.docx",
        ...details,
      });

      // assert
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ problems });
      expect(await resources.resourceRowsOf(clientId)).toEqual([]);
      expect(await resources.storedFileCountOf(clientId)).toBe(0);
    });
  });

  describe("serving a resource", () => {
    it("serves each page image privately as a WebP the size of a page", async () => {
      // arrange
      const { resource } = await anaWithPdf();

      // act
      const response = await resources.openPage(COACH_SESSION, resource.id, 2);

      // assert
      expect(response.status).toBe(200);
      const body = Buffer.from(await response.arrayBuffer());
      expectPrivateImageHeaders(response, body);
      expect(await renditionOf(body)).toEqual({
        format: "webp",
        longEdge: PAGE_LONG_EDGE,
      });
    });

    it("serves the thumbnail privately as a small WebP", async () => {
      // arrange
      const { resource } = await anaWithPdf();

      // act
      const response = await resources.openThumbnail(
        COACH_SESSION,
        resource.id,
      );

      // assert
      expect(response.status).toBe(200);
      const body = Buffer.from(await response.arrayBuffer());
      expectPrivateImageHeaders(response, body);
      expect(await renditionOf(body)).toEqual({
        format: "webp",
        longEdge: THUMBNAIL_LONG_EDGE,
      });
    });

    it.each([4, 0, "first"])(
      "answers not found to page %s of a three-page PDF",
      async (pageNumber) => {
        // arrange
        const { resource } = await anaWithPdf();

        // act
        const response = await resources.openPage(
          COACH_SESSION,
          resource.id,
          pageNumber,
        );

        // assert
        expect(response.status).toBe(404);
      },
    );

    it("answers not found to a page or a thumbnail of a Word document", async () => {
      // arrange
      const clientId = await admitAna();
      const resource = await resources.uploadAccepted(COACH_SESSION, clientId, {
        bytes: await wordDocument(),
        fileName: "Notes.docx",
      });

      // act
      const page = await resources.openPage(COACH_SESSION, resource.id, 1);
      const thumbnail = await resources.openThumbnail(
        COACH_SESSION,
        resource.id,
      );

      // assert
      expect(page.status).toBe(404);
      expect(thumbnail.status).toBe(404);
    });

    it("downloads the original unchanged as an attachment under its original name", async () => {
      // arrange
      const clientId = await admitAna();
      const pdf = await pdfWithPages(1);
      const resource = await resources.uploadAccepted(COACH_SESSION, clientId, {
        bytes: pdf,
        fileName: NON_ASCII_NAME,
        title: "Plan alimentar",
      });

      // act
      const response = await resources.download(COACH_SESSION, resource.id);

      // assert
      expect(response.status).toBe(200);
      expect(resource.file.originalName).toBe(NON_ASCII_NAME);
      expect(response.headers.get("content-disposition")).toBe(
        `attachment; filename="Plan alimentar _ s_pt_m_na 1.pdf"; filename*=UTF-8''${encodeURIComponent(NON_ASCII_NAME)}`,
      );
      expect(response.headers.get("content-type")).toBe("application/pdf");
      expect(response.headers.get("content-length")).toBe(
        String(pdf.byteLength),
      );
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
      expect(response.headers.get("content-security-policy")).toContain(
        "sandbox",
      );
      expect(response.headers.get("cross-origin-resource-policy")).toBe(
        "same-origin",
      );
      expect(Buffer.from(await response.arrayBuffer())).toEqual(pdf);
    });

    it("downloads a PDF sent under another extension as a PDF, named for what it is", async () => {
      // arrange
      const clientId = await admitAna();
      const pdf = await pdfWithPages(1);
      const resource = await resources.uploadAccepted(COACH_SESSION, clientId, {
        bytes: pdf,
        fileName: "plan.html",
        title: "Plan",
      });

      // act
      const response = await resources.download(COACH_SESSION, resource.id);

      // assert
      expect(resource.file).toMatchObject({
        originalName: "plan.html",
        downloadName: "plan.pdf",
        kind: "pdf",
      });
      expect(response.status).toBe(200);
      expect(response.headers.get("content-disposition")).toBe(
        "attachment; filename=\"plan.pdf\"; filename*=UTF-8''plan.pdf",
      );
      expect(response.headers.get("content-type")).toBe("application/pdf");
      expect(Buffer.from(await response.arrayBuffer())).toEqual(pdf);
    });

    it("answers not found to a resource that does not exist", async () => {
      // arrange
      await admitAna();

      // act
      const answers = await Promise.all([
        resources.openPage(COACH_SESSION, UNKNOWN_ID, 1),
        resources.openThumbnail(COACH_SESSION, UNKNOWN_ID),
        resources.download(COACH_SESSION, UNKNOWN_ID),
      ]);

      // assert
      expect(answers.map(({ status }) => status)).toEqual([404, 404, 404]);
    });

    it("answers not found to a resource id that is not a uuid", async () => {
      // arrange, act
      const answers = await Promise.all([
        resources.openPage(COACH_SESSION, NOT_A_UUID, 1),
        resources.openThumbnail(COACH_SESSION, NOT_A_UUID),
        resources.download(COACH_SESSION, NOT_A_UUID),
      ]);

      // assert
      expect(answers.map(({ status }) => status)).toEqual([404, 404, 404]);
    });

    it("serves the download to reads only", async () => {
      // arrange
      const { resource } = await anaWithPdf();

      // act
      const response = await rig.requestAs(
        COACH_SESSION,
        `/api/client-resources/${resource.id}/download`,
        { method: "POST" },
      );

      // assert
      expect(response.status).toBe(405);
    });
  });

  describe("who reaches a client's resources", () => {
    it.each([
      { who: "a signed-in client", requester: ANA_SESSION, status: 403 },
      { who: "a signed-out visitor", requester: VISITOR, status: 401 },
    ] as const)(
      "refuses $who an upload and keeps nothing",
      async ({ requester, status }) => {
        // arrange
        const clientId = await admitAna();

        // act
        const response = await resources.upload(requester, clientId, {
          bytes: await wordDocument(),
          fileName: "Notes.docx",
        });

        // assert
        expect(response.status).toBe(status);
        expect(await resources.resourceRowsOf(clientId)).toEqual([]);
        expect(await resources.storedFileCountOf(clientId)).toBe(0);
      },
    );

    it("serves a submitted client the page images, the thumbnail and the original of her own resource", async () => {
      // arrange
      const { clientId, resource, pdf } = await submittedAnaWithPdf();

      // act
      const [page, thumbnail, download] = await Promise.all([
        resources.openPage(ANA_SESSION, resource.id, 2),
        resources.openThumbnail(ANA_SESSION, resource.id),
        resources.download(ANA_SESSION, resource.id),
      ]);

      // assert
      const pageBody = Buffer.from(await page.arrayBuffer());
      expect(page.status).toBe(200);
      expectPrivateImageHeaders(page, pageBody);
      expect(pageBody).toEqual(
        await resources.storedFileOf(clientId, resource.id, "page-2"),
      );
      const thumbnailBody = Buffer.from(await thumbnail.arrayBuffer());
      expect(thumbnail.status).toBe(200);
      expectPrivateImageHeaders(thumbnail, thumbnailBody);
      expect(download.status).toBe(200);
      expect(download.headers.get("content-disposition")).toContain(
        'filename="Meal plan.pdf"',
      );
      expect(Buffer.from(await download.arrayBuffer())).toEqual(pdf);
    });

    it("answers another client not found on the page images, the thumbnail, the download and the opened mark", async () => {
      // arrange
      const { clientId, resource } = await submittedAnaWithPdf();
      await submittedMaria();

      // act
      const answers = await Promise.all([
        resources.openPage(MARIA_SESSION, resource.id, 1),
        resources.openThumbnail(MARIA_SESSION, resource.id),
        resources.download(MARIA_SESSION, resource.id),
        resources.markOpened(MARIA_SESSION, resource.id),
      ]);

      // assert
      expect(answers.map(({ status }) => status)).toEqual([404, 404, 404, 404]);
      expect(await openedAtOf(clientId)).toEqual([null]);
    });

    it("refuses the coach the opened mark and keeps the resource unopened", async () => {
      // arrange
      const { clientId, resource } = await submittedAnaWithPdf();

      // act
      const response = await resources.markOpened(COACH_SESSION, resource.id);

      // assert
      expect(response.status).toBe(403);
      expect(await openedAtOf(clientId)).toEqual([null]);
    });

    it("answers a signed-out visitor as signed out on the page images, the thumbnail, the download and the opened mark", async () => {
      // arrange
      const { clientId, resource } = await submittedAnaWithPdf();

      // act
      const answers = await Promise.all([
        resources.openPage(VISITOR, resource.id, 1),
        resources.openThumbnail(VISITOR, resource.id),
        resources.download(VISITOR, resource.id),
        resources.markOpened(VISITOR, resource.id),
      ]);

      // assert
      expect(answers.map(({ status }) => status)).toEqual([401, 401, 401, 401]);
      expect(await openedAtOf(clientId)).toEqual([null]);
    });

    it.each([
      {
        who: "who has not submitted her onboarding",
        arrange: async () => anaWithPdf(),
      },
      {
        who: "whose coaching has ended",
        arrange: async () => {
          const arranged = await submittedAnaWithPdf();
          await endAnasCoaching();

          return arranged;
        },
      },
    ])(
      "answers a client $who not found on every file of her own resource and on its opened mark",
      async ({ arrange }) => {
        // arrange
        const { clientId, resource } = await arrange();

        // act
        const answers = await Promise.all([
          resources.openPage(ANA_SESSION, resource.id, 1),
          resources.openThumbnail(ANA_SESSION, resource.id),
          resources.download(ANA_SESSION, resource.id),
          resources.markOpened(ANA_SESSION, resource.id),
        ]);

        // assert
        expect(answers.map(({ status }) => status)).toEqual([
          404, 404, 404, 404,
        ]);
        expect(await openedAtOf(clientId)).toEqual([null]);
      },
    );
  });

  describe("marking a resource opened", () => {
    it("stamps the moment she first opened it and answers that it is opened", async () => {
      // arrange
      const { clientId, resource } = await submittedAnaWithPdf();
      await rig.holdClock(FIRST_OPENED);

      // act
      const response = await resources.markOpened(ANA_SESSION, resource.id);

      // assert
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ status: "opened" });
      expect(await openedAtOf(clientId)).toEqual([FIRST_OPENED]);
    });

    it("keeps the first moment when she opens it again", async () => {
      // arrange
      const { clientId, resource } = await submittedAnaWithPdf();
      await rig.holdClock(FIRST_OPENED);
      await resources.markOpened(ANA_SESSION, resource.id);
      await rig.holdClock(OPENED_AGAIN);

      // act
      const response = await resources.markOpened(ANA_SESSION, resource.id);

      // assert
      expect(response.status).toBe(200);
      expect(await openedAtOf(clientId)).toEqual([FIRST_OPENED]);
    });

    it("answers not found to a resource that does not exist or an id that is not a uuid", async () => {
      // arrange
      await submittedAnaWithPdf();

      // act
      const answers = await Promise.all([
        resources.markOpened(ANA_SESSION, UNKNOWN_ID),
        resources.markOpened(ANA_SESSION, NOT_A_UUID),
      ]);

      // assert
      expect(answers.map(({ status }) => status)).toEqual([404, 404]);
    });

    it("takes the opened mark as a write only", async () => {
      // arrange
      const { resource } = await submittedAnaWithPdf();

      // act
      const response = await rig.requestAs(
        ANA_SESSION,
        `/api/client-resources/${resource.id}/opened`,
      );

      // assert
      expect(response.status).toBe(405);
    });

    it("leaves the coach's page listing the resource after she opened it", async () => {
      // arrange
      const { clientId, resource } = await submittedAnaWithPdf();
      await resources.markOpened(ANA_SESSION, resource.id);

      // act
      const response = await rig.requestAs(
        COACH_SESSION,
        `/coach/clients/${clientId}/resources`,
      );

      // assert
      expect(response.status).toBe(200);
      const page = await pageTextOf(response);
      expect(page).toContain("PDF 3 pages Meal plan.pdf");
      expect(page).not.toContain("New");
    });
  });

  describe("changing a resource's details", () => {
    it("keeps the new title and description trimmed, lists the new title to the coach and to her, and keeps the moment she opened it", async () => {
      // arrange
      const { clientId, resource } = await submittedAnaWithPdf();
      await rig.holdClock(FIRST_OPENED);
      await resources.markOpened(ANA_SESSION, resource.id);

      // act
      const response = await resources.changeDetails(
        COACH_SESSION,
        resource.id,
        {
          title: "  Week two plan  ",
          description: "  Swap the oats  ",
          tags: [],
        },
      );

      // assert
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        resource: {
          ...resource,
          title: "Week two plan",
          description: "Swap the oats",
          openedAt: FIRST_OPENED.toISOString(),
        },
      });
      expect(await resources.resourceRowsOf(clientId)).toEqual([
        expect.objectContaining({
          id: resource.id,
          title: "Week two plan",
          description: "Swap the oats",
          openedAt: FIRST_OPENED,
        }),
      ]);
      const coachPage = await pageTextOf(
        await rig.requestAs(
          COACH_SESSION,
          `/coach/clients/${clientId}/resources`,
        ),
      );
      expect(coachPage).toContain("PDF 3 pages Week two plan");
      expect(coachPage).not.toContain("Meal plan");
      const herPage = await pageTextOf(
        await resources.openResourcesPage(ANA_SESSION),
      );
      expect(herPage).toContain("PDF 3 pages Week two plan");
      expect(herPage).not.toContain("Meal plan");
    });

    it("answers a blank title as a bad request naming the problem and changes nothing", async () => {
      // arrange
      const { clientId, resource } = await submittedAnaWithPdf();

      // act
      const response = await resources.changeDetails(
        COACH_SESSION,
        resource.id,
        { title: "   ", description: "Swap the oats", tags: [] },
      );

      // assert
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        problems: { title: "missing" },
      });
      expect(await resources.resourceRowsOf(clientId)).toEqual([
        expect.objectContaining({ title: "Meal plan.pdf", description: "" }),
      ]);
    });
  });

  describe("tagging a resource", () => {
    it("keeps the tags she chose in her order, tidied, and answers them on the resource", async () => {
      // arrange
      const clientId = await admitAna();

      // act
      const resource = await resources.uploadAccepted(COACH_SESSION, clientId, {
        bytes: await wordDocument(),
        fileName: "Meal plan.docx",
        tags: ["Meals", "  week   one ", "MEALS", " "],
      });

      // assert
      expect(resource.tags).toEqual(["Meals", "week one"]);
      expect(await resources.resourceRowsOf(clientId)).toEqual([
        expect.objectContaining({ tags: ["Meals", "week one"] }),
      ]);
    });

    it("attaches the spelling she used first to a tag typed in another casing, across her clients", async () => {
      // arrange
      const anaId = await admitAna();
      const mariaId = await admitMaria();
      await resources.uploadAccepted(COACH_SESSION, anaId, {
        bytes: await wordDocument(),
        fileName: "Batch cooking.docx",
        tags: ["Meal prep"],
      });

      // act
      const resource = await resources.uploadAccepted(COACH_SESSION, mariaId, {
        bytes: await wordDocument(),
        fileName: "Sunday prep.docx",
        tags: ["MEAL PREP", "Mobility"],
      });

      // assert
      expect(resource.tags).toEqual(["Meal prep", "Mobility"]);
      expect(await resources.resourceRowsOf(mariaId)).toEqual([
        expect.objectContaining({ tags: ["Meal prep", "Mobility"] }),
      ]);
    });

    it("matches a tag by the fold the domain gives it alone, so a casing the database would lower differently still attaches and narrows", async () => {
      // arrange
      const clientId = await submittedAna();
      await rig.holdClock(FIRST_ADDED);
      await resources.uploadAccepted(COACH_SESSION, clientId, {
        bytes: await wordDocument(),
        fileName: "Travel snacks.docx",
        title: "Travel snacks",
        tags: ["İzmir"],
      });
      await rig.holdClock(SECOND_ADDED);
      const second = await resources.uploadAccepted(COACH_SESSION, clientId, {
        bytes: await wordDocument(),
        fileName: "Hotel workouts.docx",
        title: "Hotel workouts",
        tags: ["İZMIR"],
      });
      await rig.holdClock(THIRD_ADDED);
      await resources.uploadAccepted(COACH_SESSION, clientId, {
        bytes: await wordDocument(),
        fileName: "Food diary.docx",
        title: "Food diary",
      });

      // act
      const response = await openCoachResourcesPage(
        clientId,
        `?tag=${encodeURIComponent("İZMIR")}`,
      );

      // assert
      expect(second.tags).toEqual(["İzmir"]);
      expect(response.status).toBe(200);
      expect(
        titlesListedIn(await pageTextOf(response), [
          "Food diary",
          "Hotel workouts",
          "Travel snacks",
        ]),
      ).toEqual(["Hotel workouts", "Travel snacks"]);
    });

    it("replaces the tags when she edits them, with the spelling she used before", async () => {
      // arrange
      const clientId = await admitAna();
      await rig.holdClock(FIRST_ADDED);
      await resources.uploadAccepted(COACH_SESSION, clientId, {
        bytes: await wordDocument(),
        fileName: "Batch cooking.docx",
        tags: ["Meals"],
      });
      await rig.holdClock(SECOND_ADDED);
      const resource = await resources.uploadAccepted(COACH_SESSION, clientId, {
        bytes: await wordDocument(),
        fileName: "Breakfasts.docx",
        tags: ["Week one", "Snacks"],
      });

      // act
      const response = await resources.changeDetails(
        COACH_SESSION,
        resource.id,
        {
          title: resource.title,
          description: "",
          tags: ["Breakfast", "meals", "week ONE"],
        },
      );

      // assert
      expect(response.status).toBe(200);
      const { resource: changed } = (await response.json()) as {
        resource: AddedResource;
      };
      expect(changed.tags).toEqual(["Breakfast", "Meals", "Week one"]);
      expect(
        (await resources.resourceRowsOf(clientId)).map(({ tags }) => tags),
      ).toEqual([["Breakfast", "Meals", "Week one"], ["Meals"]]);
    });

    it("removes every tag of a resource she saves without tags", async () => {
      // arrange
      const clientId = await admitAna();
      const resource = await resources.uploadAccepted(COACH_SESSION, clientId, {
        bytes: await wordDocument(),
        fileName: "Breakfasts.docx",
        tags: ["Meals"],
      });

      // act
      const response = await resources.changeDetails(
        COACH_SESSION,
        resource.id,
        { title: resource.title, description: "", tags: [] },
      );

      // assert
      expect(response.status).toBe(200);
      expect(await resources.resourceRowsOf(clientId)).toEqual([
        expect.objectContaining({ tags: [] }),
      ]);
    });

    it("refuses a tag over 30 characters on an edit and keeps the tags she had", async () => {
      // arrange
      const clientId = await admitAna();
      const resource = await resources.uploadAccepted(COACH_SESSION, clientId, {
        bytes: await wordDocument(),
        fileName: "Breakfasts.docx",
        tags: ["Meals"],
      });

      // act
      const response = await resources.changeDetails(
        COACH_SESSION,
        resource.id,
        { title: resource.title, description: "", tags: ["t".repeat(31)] },
      );

      // assert
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        problems: { tags: "too-long" },
      });
      expect(await resources.resourceRowsOf(clientId)).toEqual([
        expect.objectContaining({ tags: ["Meals"] }),
      ]);
    });

    it("forgets a tag once its last resource is removed, so it narrows nothing and the next spelling is kept", async () => {
      // arrange
      const { clientId, warmUp } = await anaWithTaggedLibrary();
      await resources.remove(COACH_SESSION, warmUp.id);

      // act
      const page = await openCoachResourcesPage(clientId, "?tag=Warm-ups");
      const retagged = await resources.uploadAccepted(COACH_SESSION, clientId, {
        bytes: await wordDocument(),
        fileName: "Mobility flow.docx",
        tags: ["WARM-UPS"],
      });

      // assert
      expect(page.status).toBe(200);
      expect(titlesListedIn(await pageTextOf(page), LIBRARY_TITLES)).toEqual([
        BATCH_COOKING,
        MEAL_PLAN,
      ]);
      expect(retagged.tags).toEqual(["WARM-UPS"]);
    });
  });

  describe("removing a resource", () => {
    it("removes a PDF with its original, every page image and its thumbnail, and its files answer not found to the coach and to her", async () => {
      // arrange
      const { clientId, resource } = await submittedAnaWithPdf();

      // act
      const response = await resources.remove(COACH_SESSION, resource.id);

      // assert
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ status: "removed" });
      expect(await resources.resourceRowsOf(clientId)).toEqual([]);
      expect(await resources.storedFileNamesOf(clientId, resource.id)).toEqual(
        [],
      );
      expect(await resources.storedFileCountOf(clientId)).toBe(0);
      const answers = await Promise.all(
        [COACH_SESSION, ANA_SESSION].flatMap((requester) => [
          resources.openPage(requester, resource.id, 1),
          resources.openThumbnail(requester, resource.id),
          resources.download(requester, resource.id),
        ]),
      );
      expect(answers.map(({ status }) => status)).toEqual([
        404, 404, 404, 404, 404, 404,
      ]);
    });

    it("answers not found when the resource was already removed", async () => {
      // arrange
      const { resource } = await anaWithPdf();

      // act
      const first = await resources.remove(COACH_SESSION, resource.id);
      const again = await resources.remove(COACH_SESSION, resource.id);

      // assert
      expect([first.status, again.status]).toEqual([200, 404]);
    });
  });

  describe("reaching one resource to change or remove it", () => {
    it.each([
      { who: "a signed-in client", requester: ANA_SESSION, status: 403 },
      { who: "a signed-out visitor", requester: VISITOR, status: 401 },
    ] as const)(
      "refuses $who the change and the removal of her resource and changes nothing",
      async ({ requester, status }) => {
        // arrange
        const { clientId, resource } = await submittedAnaWithPdf();

        // act
        const answers = await Promise.all([
          resources.changeDetails(requester, resource.id, {
            title: "Week two plan",
            description: "",
            tags: [],
          }),
          resources.remove(requester, resource.id),
        ]);

        // assert
        expect(answers.map(({ status }) => status)).toEqual([status, status]);
        expect(await resources.resourceRowsOf(clientId)).toEqual([
          expect.objectContaining({ id: resource.id, title: "Meal plan.pdf" }),
        ]);
        expect(
          await resources.storedFileNamesOf(clientId, resource.id),
        ).toEqual(["original", "page-1", "page-2", "page-3", "thumbnail"]);
      },
    );

    it("answers not found to a resource that does not exist or an id that is not a uuid", async () => {
      // arrange
      await anaWithPdf();
      const details = { title: "Week two plan", description: "", tags: [] };

      // act
      const answers = await Promise.all([
        resources.changeDetails(COACH_SESSION, UNKNOWN_ID, details),
        resources.changeDetails(COACH_SESSION, NOT_A_UUID, details),
        resources.remove(COACH_SESSION, UNKNOWN_ID),
        resources.remove(COACH_SESSION, NOT_A_UUID),
      ]);

      // assert
      expect(answers.map(({ status }) => status)).toEqual([404, 404, 404, 404]);
    });

    it("takes the resource only as a change or a removal", async () => {
      // arrange
      const { resource } = await anaWithPdf();
      const target = `/api/client-resources/${resource.id}`;

      // act
      const answers = await Promise.all([
        rig.requestAs(COACH_SESSION, target),
        rig.requestAs(COACH_SESSION, target, { method: "POST" }),
      ]);

      // assert
      expect(answers.map(({ status }) => status)).toEqual([405, 405]);
    });
  });

  describe("her resources page", () => {
    it("lists only her own resources, the newest first", async () => {
      // arrange
      const anaId = await submittedAna();
      const mariaId = await submittedMaria();
      await rig.holdClock(FIRST_ADDED);
      await resources.uploadAccepted(COACH_SESSION, anaId, {
        bytes: await wordDocument(),
        fileName: "Food diary.docx",
        title: "Food diary",
      });
      await resources.uploadAccepted(COACH_SESSION, mariaId, {
        bytes: await wordDocument(),
        fileName: "For Maria.docx",
        title: "For Maria",
      });
      await rig.holdClock(SECOND_ADDED);
      await resources.uploadAccepted(COACH_SESSION, anaId, {
        bytes: await excelWorkbook(),
        fileName: "Macro tracker.xlsx",
        title: "Macro tracker",
      });

      // act
      const response = await resources.openResourcesPage(ANA_SESSION);

      // assert
      expect(response.status).toBe(200);
      const page = await pageTextOf(response);
      expect(page).toContain(
        "Resources All tags XLS New Macro tracker DOC New Food diary",
      );
      expect(page).not.toContain("For Maria");
    });

    it("marks a resource New until she opens it", async () => {
      // arrange
      const { resource } = await submittedAnaWithPdf();
      const unopened = await pageTextOf(
        await resources.openResourcesPage(ANA_SESSION),
      );

      // act
      await resources.markOpened(ANA_SESSION, resource.id);

      // assert
      const response = await resources.openResourcesPage(ANA_SESSION);
      expect(response.status).toBe(200);
      expect(unopened).toContain("PDF 3 pages New Meal plan.pdf");
      const opened = await pageTextOf(response);
      expect(opened).toContain("PDF 3 pages Meal plan.pdf");
      expect(opened).not.toContain("New");
    });

    it("marks Resources new in her navigation while any of her resources is unopened", async () => {
      // arrange
      const { clientId, resource } = await submittedAnaWithPdf();
      const second = await resources.uploadAccepted(COACH_SESSION, clientId, {
        bytes: await wordDocument(),
        fileName: "Food diary.docx",
      });
      await resources.markOpened(ANA_SESSION, resource.id);

      // act
      const oneUnopened = await rig.requestAs(ANA_SESSION, CLIENT_PORTAL);
      await resources.markOpened(ANA_SESSION, second.id);
      const allOpened = await rig.requestAs(ANA_SESSION, CLIENT_PORTAL);

      // assert
      expect(oneUnopened.status).toBe(200);
      expect(await pageTextOf(oneUnopened)).toContain(
        "Profile Resources (new) Settings",
      );
      expect(allOpened.status).toBe(200);
      const navigation = await pageTextOf(allOpened);
      expect(navigation).toContain("Profile Resources Settings");
      expect(navigation).not.toContain("(new)");
    });

    it.each([
      {
        who: "who has not submitted her onboarding",
        arrange: async () => anaWithPdf(),
        location: WELCOME,
      },
      {
        who: "whose coaching has ended",
        arrange: async () => {
          const arranged = await submittedAnaWithPdf();
          await endAnasCoaching();

          return arranged;
        },
        location: ENDED_PAGE,
      },
    ])(
      "sends a client $who away from the page",
      async ({ arrange, location }) => {
        // arrange
        await arrange();

        // act
        const response = await resources.openResourcesPage(ANA_SESSION);

        // assert
        expect(response.status).toBe(302);
        expect(response.headers.get("location")).toBe(suite.path(location));
      },
    );
  });

  describe("finding a resource", () => {
    it.each([
      {
        name: "her resources holding a tag, whatever its casing",
        query: "?tag=MEALS",
        titles: [BATCH_COOKING, MEAL_PLAN],
      },
      {
        name: "her resources whose title holds a search with a percent sign",
        query: `?q=${encodeURIComponent("50%")}`,
        titles: [MEAL_PLAN],
      },
      {
        name: "only her resource whose title holds a percent sign for a search of one",
        query: `?q=${encodeURIComponent("%")}`,
        titles: [MEAL_PLAN],
      },
      {
        name: "her resources holding a tag whose title holds the search",
        query: "?tag=Meals&q=cook",
        titles: [BATCH_COOKING],
      },
      {
        name: "her resources by title from A to Z",
        query: "?sort=title",
        titles: [BATCH_COOKING, GLUTE_WARM_UP, MEAL_PLAN],
      },
      {
        name: "her resources by title from Z to A",
        query: "?sort=title&dir=desc",
        titles: [MEAL_PLAN, GLUTE_WARM_UP, BATCH_COOKING],
      },
      {
        name: "her resources the newest first",
        query: "",
        titles: [BATCH_COOKING, MEAL_PLAN, GLUTE_WARM_UP],
      },
      {
        name: "her resources the oldest first",
        query: "?dir=asc",
        titles: [GLUTE_WARM_UP, MEAL_PLAN, BATCH_COOKING],
      },
      {
        name: "every resource of hers for a tag none of them holds",
        query: "?tag=Nonexistent",
        titles: [BATCH_COOKING, MEAL_PLAN, GLUTE_WARM_UP],
      },
      {
        name: "every resource of hers for a sort and direction it does not know",
        query: "?sort=size&dir=sideways",
        titles: [BATCH_COOKING, MEAL_PLAN, GLUTE_WARM_UP],
      },
    ])("lists the coach $name", async ({ query, titles }) => {
      // arrange
      const { clientId } = await anaWithTaggedLibrary();

      // act
      const response = await openCoachResourcesPage(clientId, query);

      // assert
      expect(response.status).toBe(200);
      expect(
        titlesListedIn(await pageTextOf(response), LIBRARY_TITLES),
      ).toEqual(titles);
    });

    it("narrows her own page by her tags and her search", async () => {
      // arrange
      await anaWithTaggedLibrary();

      // act
      const response = await resources.openResourcesPage(
        ANA_SESSION,
        "?tag=meals&q=PLAN",
      );

      // assert
      expect(response.status).toBe(200);
      expect(
        titlesListedIn(await pageTextOf(response), LIBRARY_TITLES),
      ).toEqual([MEAL_PLAN]);
    });

    it("lists her every resource for a tag only another client's resources hold", async () => {
      // arrange
      await anaWithTaggedLibrary();
      const mariaId = await submittedMaria();
      await resources.uploadAccepted(COACH_SESSION, mariaId, {
        bytes: await wordDocument(),
        fileName: "Hip mobility.docx",
        title: "Hip mobility",
        tags: ["Mobility"],
      });

      // act
      const response = await resources.openResourcesPage(
        ANA_SESSION,
        "?tag=Mobility",
      );

      // assert
      expect(response.status).toBe(200);
      const page = await pageTextOf(response);
      expect(titlesListedIn(page, LIBRARY_TITLES)).toEqual([
        BATCH_COOKING,
        MEAL_PLAN,
        GLUTE_WARM_UP,
      ]);
      expect(page).not.toContain("Hip mobility");
    });
  });
});

async function admitAna(): Promise<string> {
  await onboarding.admit(ANA, ANA_SESSION);

  return onboarding.clientIdOf(ANA_SESSION);
}

async function admitMaria(): Promise<string> {
  await onboarding.admit(MARIA, MARIA_SESSION, SECOND_PURCHASE);

  return onboarding.clientIdOf(MARIA_SESSION);
}

async function submittedMaria(): Promise<string> {
  const clientId = await admitMaria();
  await onboarding.submit(MARIA_SESSION);

  return clientId;
}

async function anaWithPdf(): Promise<ClientWithPdf> {
  return pdfFor(await admitAna());
}

async function submittedAna(): Promise<string> {
  const clientId = await admitAna();
  await rig.holdClock(CALL_ENDED_INSTANT);
  await onboarding.submit(ANA_SESSION);

  return clientId;
}

async function submittedAnaWithPdf(): Promise<ClientWithPdf> {
  return pdfFor(await submittedAna());
}

async function pdfFor(clientId: string): Promise<ClientWithPdf> {
  const pdf = await pdfWithPages(3);
  const upload: ResourceUpload = { bytes: pdf, fileName: "Meal plan.pdf" };

  return {
    clientId,
    pdf,
    resource: await resources.uploadAccepted(COACH_SESSION, clientId, upload),
  };
}

async function anaWithTaggedLibrary(): Promise<TaggedLibrary> {
  const clientId = await submittedAna();
  await rig.holdClock(FIRST_ADDED);
  const warmUp = await resources.uploadAccepted(COACH_SESSION, clientId, {
    bytes: await wordDocument(),
    fileName: "Glute warm-up.docx",
    title: GLUTE_WARM_UP,
    tags: ["Warm-ups"],
  });
  await rig.holdClock(SECOND_ADDED);
  await resources.uploadAccepted(COACH_SESSION, clientId, {
    bytes: await wordDocument(),
    fileName: "Meal plan.docx",
    title: MEAL_PLAN,
    tags: ["Meals"],
  });
  await rig.holdClock(THIRD_ADDED);
  await resources.uploadAccepted(COACH_SESSION, clientId, {
    bytes: await wordDocument(),
    fileName: "Batch cooking.docx",
    title: BATCH_COOKING,
    tags: ["Meals", "Week one"],
  });

  return { clientId, warmUp };
}

function openCoachResourcesPage(
  clientId: string,
  query: string,
): Promise<Response> {
  return rig.requestAs(
    COACH_SESSION,
    `/coach/clients/${clientId}/resources${query}`,
  );
}

function titlesListedIn(page: string, titles: readonly string[]): string[] {
  return titles
    .filter((title) => page.includes(title))
    .sort((one, other) => page.indexOf(one) - page.indexOf(other));
}

async function endAnasCoaching(): Promise<void> {
  const delivered = await lifecycle.deliverEvent({
    id: "evt_resources_coaching_ended",
    type: "customer.subscription.deleted",
    object: stripeSubscriptionObject({
      status: "canceled",
      ended_at: toUnixSeconds(rig.now()),
    }),
  });

  if (delivered.status !== 200) {
    throw new Error(`Ending her coaching answered ${delivered.status}.`);
  }
}

async function openedAtOf(clientId: string): Promise<(Date | null)[]> {
  const rows = await resources.resourceRowsOf(clientId);

  return rows.map(({ openedAt }) => openedAt);
}

async function pageTextOf(response: Response): Promise<string> {
  return textNodesOf(await visibleDocument(response))
    .filter((text) => text.length > 0)
    .join(" ");
}

function expectPrivateImageHeaders(response: Response, body: Buffer): void {
  expect(response.headers.get("content-type")).toBe("image/webp");
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  expect(response.headers.get("content-security-policy")).toContain("sandbox");
  expect(response.headers.get("cross-origin-resource-policy")).toBe(
    "same-origin",
  );
  expect(response.headers.get("content-length")).toBe(String(body.byteLength));
}

async function renditionOf(
  bytes: Buffer,
): Promise<{ format: string; longEdge: number }> {
  const facts = await imageFactsOf(bytes);

  return {
    format: facts.format,
    longEdge: Math.max(facts.width, facts.height),
  };
}
