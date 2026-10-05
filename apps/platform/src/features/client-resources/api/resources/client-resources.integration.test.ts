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
  excelWorkbook,
  oldExcelWorkbook,
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
} from "~integration-test-config/sample-documents";
import {
  cameraJpegWithOrientationAndLocation,
  imageFactsOf,
} from "~integration-test-config/sample-images";

const suite = new ApiIntegrationTestSuite();
const rig = new PlatformRig(suite);
const sales = new CoachingSalesJourney(rig);
const onboarding = new ClientOnboardingJourney(rig, sales);
const resources = new ClientResourcesJourney(rig);

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
const UNKNOWN_ID = "9e8d7c6b-5a49-4382-9716-a5b4c3d2e1f0";
const NOT_A_UUID = "not-a-resource-id";
const NON_ASCII_NAME = "Plan alimentar – săptămâna 1.pdf";

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
        file: {
          originalName: "Meal plan.pdf",
          kind: "pdf",
          sizeBytes: pdf.byteLength,
          pageCount: 3,
        },
        addedAt: FIRST_ADDED.toISOString(),
      });
      expect(await resources.resourceRowsOf(clientId)).toEqual([
        {
          id: resource.id,
          title: "Meal plan",
          description: "Week one",
          originalName: "Meal plan.pdf",
          format: "pdf",
          sizeBytes: pdf.byteLength,
          pageCount: 3,
          addedAt: FIRST_ADDED,
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

    it("refuses a body over the upload cap before reading it and keeps nothing", async () => {
      // arrange
      const clientId = await admitAna();

      // act
      const response = await resources.upload(COACH_SESSION, clientId, {
        bytes: paddedPdfOfLength(BODY_CAP_BYTES + 1),
        fileName: "huge.pdf",
      });

      // assert
      expect(response.status).toBe(413);
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

  describe("keeping resources to the coach", () => {
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

    it.each([
      { who: "a signed-in client", requester: ANA_SESSION, status: 403 },
      { who: "a signed-out visitor", requester: VISITOR, status: 401 },
    ] as const)(
      "refuses $who the page images, the thumbnail and the download",
      async ({ requester, status }) => {
        // arrange
        const { resource } = await anaWithPdf();

        // act
        const answers = await Promise.all([
          resources.openPage(requester, resource.id, 1),
          resources.openThumbnail(requester, resource.id),
          resources.download(requester, resource.id),
        ]);

        // assert
        expect(answers.map((answer) => answer.status)).toEqual([
          status,
          status,
          status,
        ]);
      },
    );
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

async function anaWithPdf(): Promise<{
  clientId: string;
  resource: AddedResource;
}> {
  const clientId = await admitAna();
  const upload: ResourceUpload = {
    bytes: await pdfWithPages(3),
    fileName: "Meal plan.pdf",
  };

  return {
    clientId,
    resource: await resources.uploadAccepted(COACH_SESSION, clientId, upload),
  };
}

function expectPrivateImageHeaders(response: Response, body: Buffer): void {
  expect(response.headers.get("content-type")).toBe("image/webp");
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  expect(response.headers.get("content-security-policy")).toContain("sandbox");
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
