import type { AccountSnapshot } from "@eli-coach-platform/domain/account";
import {
  ClientResource,
  type AddClientResourceResult,
  type AddClientResourceUseCase,
  type DownloadClientResourceResult,
  type DownloadClientResourceUseCase,
  type OpenResourcePageResult,
  type OpenResourcePageUseCase,
} from "@eli-coach-platform/domain/client-resources";
import { describe, expect, it, vi } from "vitest";

import {
  sessionContext,
  type ResolvedSession,
} from "~/features/accounts/server/guards/session-context.server";
import { RESOURCE_UPLOAD_PARTS } from "~/features/client-resources/contracts/resource-upload-parts";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { ClientResourcesController } from "./client-resources-controller.server";

const CLIENT_ID = "8f9a2c41-3b7e-4d55-9c1a-6e2f0b7d4c02";
const RESOURCE_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
const PAGE_BYTES = new Uint8Array([0x52, 0x49, 0x46, 0x46]);
const UPLOAD_URL = `https://evoa.fit/api/client-resources/clients/${CLIENT_ID}/resources`;
const BODY_CAP_BYTES = 26 * 1024 * 1024;

const COACH: AccountSnapshot = {
  authSubjectId: "user_eli",
  id: "acct_eli",
  role: "COACH",
};

const CLIENT_SESSION: ResolvedSession = {
  account: { authSubjectId: "user_ana", id: "acct_ana", role: "CLIENT" },
  kind: "authenticated",
};

const ANONYMOUS_SESSION: ResolvedSession = { kind: "anonymous" };

const ADDED_PDF = ClientResource.reconstitute({
  id: RESOURCE_ID,
  clientId: CLIENT_ID,
  title: "Meal plan",
  description: "Week one",
  file: {
    originalName: "Meal plan.pdf",
    format: "pdf",
    sizeBytes: PDF_BYTES.byteLength,
    pageCount: 3,
  },
  addedAt: new Date("2026-10-05T09:30:00.000Z"),
});

describe("ClientResourcesController add", () => {
  it("adds the file she sent with her title and description and answers the resource as the page shows it", async () => {
    // arrange
    const { controller, addClientResource } = createController({
      added: { status: "added", resource: ADDED_PDF },
    });

    // act
    const response = await controller.add(
      uploadArgs({ form: uploadForm() }),
      CLIENT_ID,
    );

    // assert
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      resource: {
        id: RESOURCE_ID,
        title: "Meal plan",
        description: "Week one",
        file: {
          originalName: "Meal plan.pdf",
          kind: "pdf",
          sizeBytes: PDF_BYTES.byteLength,
          pageCount: 3,
        },
        addedAt: "2026-10-05T09:30:00.000Z",
      },
    });
    expect(addClientResource).toHaveBeenCalledWith({
      requester: { role: "COACH", authSubjectId: "user_eli" },
      clientId: CLIENT_ID,
      details: { title: "Meal plan", description: "Week one" },
      file: { originalName: "Meal plan.pdf", bytes: PDF_BYTES },
    });
  });

  it.each([
    "unsupported-type",
    "too-large",
    "too-many-pages",
    "unreadable",
  ] as const)(
    "answers a refused file as unprocessable with its reason: %s",
    async (refusal) => {
      // arrange
      const { controller } = createController({
        added: { status: "refused", refusal },
      });

      // act
      const response = await controller.add(
        uploadArgs({ form: uploadForm() }),
        CLIENT_ID,
      );

      // assert
      expect(response.status).toBe(422);
      expect(await response.json()).toEqual({ refusal });
    },
  );

  it("answers details that break the rules as a bad request naming each problem", async () => {
    // arrange
    const { controller } = createController({
      added: {
        status: "invalid-details",
        problems: { title: "missing", description: "too-long" },
      },
    });

    // act
    const response = await controller.add(
      uploadArgs({ form: uploadForm() }),
      CLIENT_ID,
    );

    // assert
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      problems: { title: "missing", description: "too-long" },
    });
  });

  it("answers not found to a client who does not exist", async () => {
    // arrange
    const { controller } = createController({
      added: { status: "not-found" },
    });

    // act
    const response = await controller.add(
      uploadArgs({ form: uploadForm() }),
      CLIENT_ID,
    );

    // assert
    expect(response.status).toBe(404);
  });

  it("answers a server error when the files or the record could not be kept", async () => {
    // arrange
    const { controller } = createController({ added: { status: "failed" } });

    // act
    const response = await controller.add(
      uploadArgs({ form: uploadForm() }),
      CLIENT_ID,
    );

    // assert
    expect(response.status).toBe(500);
  });

  it("answers not found to a client id that is not a uuid without adding anything", async () => {
    // arrange
    const { controller, addClientResource } = createController();

    // act
    const response = await controller.add(
      uploadArgs({ form: uploadForm() }),
      "not-a-uuid",
    );

    // assert
    expect(response.status).toBe(404);
    expect(addClientResource).not.toHaveBeenCalled();
  });

  it("refuses a body over the upload cap as too large without reading it or adding anything", async () => {
    // arrange
    const { controller, addClientResource } = createController();
    const request = new Request(UPLOAD_URL, {
      body: "x",
      headers: {
        "Content-Length": String(BODY_CAP_BYTES + 1),
        "Content-Type": "multipart/form-data; boundary=oversized",
      },
      method: "POST",
    });

    // act
    const response = await controller.add(uploadArgs({ request }), CLIENT_ID);

    // assert
    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ refusal: "too-large" });
    expect(addClientResource).not.toHaveBeenCalled();
  });

  it("answers a bad request to a body that is not a form without adding anything", async () => {
    // arrange
    const { controller, addClientResource } = createController();
    const request = new Request(UPLOAD_URL, {
      body: JSON.stringify({ title: "Meal plan" }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    // act
    const response = await controller.add(uploadArgs({ request }), CLIENT_ID);

    // assert
    expect(response.status).toBe(400);
    expect(addClientResource).not.toHaveBeenCalled();
  });

  it("answers a bad request to a form without a file without adding anything", async () => {
    // arrange
    const { controller, addClientResource } = createController();
    const form = new FormData();
    form.set(RESOURCE_UPLOAD_PARTS.title, "Meal plan");

    // act
    const response = await controller.add(uploadArgs({ form }), CLIENT_ID);

    // assert
    expect(response.status).toBe(400);
    expect(addClientResource).not.toHaveBeenCalled();
  });

  it.each([
    { who: "a signed-in client", session: CLIENT_SESSION, status: 403 },
    {
      who: "a visitor who is not signed in",
      session: ANONYMOUS_SESSION,
      status: 401,
    },
  ])("refuses $who without adding anything", async ({ session, status }) => {
    // arrange
    const { controller, addClientResource } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.add(uploadArgs({ form: uploadForm(), session }), CLIENT_ID),
    );

    // assert
    expect((thrown as Response).status).toBe(status);
    expect(addClientResource).not.toHaveBeenCalled();
  });
});

describe("ClientResourcesController openPage", () => {
  it("answers the page image privately, never cached, sniffed or scripted", async () => {
    // arrange
    const { controller, openResourcePage } = createController({
      opened: { status: "opened", bytes: PAGE_BYTES, mimeType: "image/webp" },
    });

    // act
    const response = await controller.openPage(servingArgs(), RESOURCE_ID, "2");

    // assert
    expect(response.status).toBe(200);
    expect(Object.fromEntries(response.headers)).toEqual({
      "cache-control": "private, no-store",
      "content-length": String(PAGE_BYTES.byteLength),
      "content-security-policy": "sandbox; default-src 'none'",
      "content-type": "image/webp",
      "x-content-type-options": "nosniff",
    });
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(PAGE_BYTES);
    expect(openResourcePage).toHaveBeenCalledWith({
      requester: { role: "COACH", authSubjectId: "user_eli" },
      resourceId: RESOURCE_ID,
      preview: { kind: "page", pageNumber: 2 },
    });
  });

  it("answers not found to a page the resource does not show", async () => {
    // arrange
    const { controller } = createController({
      opened: { status: "not-found" },
    });

    // act
    const response = await controller.openPage(servingArgs(), RESOURCE_ID, "4");

    // assert
    expect(response.status).toBe(404);
  });

  it.each(["0", "-1", "1.5", "01", "two", ""])(
    "answers not found to a page number that is not a positive whole number (%s) without opening anything",
    async (pageNumber) => {
      // arrange
      const { controller, openResourcePage } = createController();

      // act
      const response = await controller.openPage(
        servingArgs(),
        RESOURCE_ID,
        pageNumber,
      );

      // assert
      expect(response.status).toBe(404);
      expect(openResourcePage).not.toHaveBeenCalled();
    },
  );

  it("answers not found to a resource id that is not a uuid without opening anything", async () => {
    // arrange
    const { controller, openResourcePage } = createController();

    // act
    const response = await controller.openPage(
      servingArgs(),
      "../../etc/passwd",
      "1",
    );

    // assert
    expect(response.status).toBe(404);
    expect(openResourcePage).not.toHaveBeenCalled();
  });

  it.each([
    { who: "a signed-in client", session: CLIENT_SESSION, status: 403 },
    {
      who: "a visitor who is not signed in",
      session: ANONYMOUS_SESSION,
      status: 401,
    },
  ])("refuses $who without opening anything", async ({ session, status }) => {
    // arrange
    const { controller, openResourcePage } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.openPage(servingArgs({ session }), RESOURCE_ID, "1"),
    );

    // assert
    expect((thrown as Response).status).toBe(status);
    expect(openResourcePage).not.toHaveBeenCalled();
  });
});

describe("ClientResourcesController openThumbnail", () => {
  it("answers the thumbnail privately, never cached, sniffed or scripted", async () => {
    // arrange
    const { controller, openResourcePage } = createController({
      opened: { status: "opened", bytes: PAGE_BYTES, mimeType: "image/webp" },
    });

    // act
    const response = await controller.openThumbnail(servingArgs(), RESOURCE_ID);

    // assert
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(PAGE_BYTES);
    expect(openResourcePage).toHaveBeenCalledWith({
      requester: { role: "COACH", authSubjectId: "user_eli" },
      resourceId: RESOURCE_ID,
      preview: { kind: "thumbnail" },
    });
  });

  it("answers not found to a resource without a thumbnail", async () => {
    // arrange
    const { controller } = createController({
      opened: { status: "not-found" },
    });

    // act
    const response = await controller.openThumbnail(servingArgs(), RESOURCE_ID);

    // assert
    expect(response.status).toBe(404);
  });

  it("answers not found to a resource id that is not a uuid without opening anything", async () => {
    // arrange
    const { controller, openResourcePage } = createController();

    // act
    const response = await controller.openThumbnail(servingArgs(), undefined);

    // assert
    expect(response.status).toBe(404);
    expect(openResourcePage).not.toHaveBeenCalled();
  });

  it.each([
    { who: "a signed-in client", session: CLIENT_SESSION, status: 403 },
    {
      who: "a visitor who is not signed in",
      session: ANONYMOUS_SESSION,
      status: 401,
    },
  ])("refuses $who without opening anything", async ({ session, status }) => {
    // arrange
    const { controller, openResourcePage } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.openThumbnail(servingArgs({ session }), RESOURCE_ID),
    );

    // assert
    expect((thrown as Response).status).toBe(status);
    expect(openResourcePage).not.toHaveBeenCalled();
  });
});

describe("ClientResourcesController download", () => {
  it("streams the original as a sandboxed attachment under its original name, type and length", async () => {
    // arrange
    const { controller, downloadClientResource } = createController({
      downloaded: {
        status: "opened",
        bytes: chunksOf(PDF_BYTES),
        sizeBytes: PDF_BYTES.byteLength,
        originalName: "Plan alimentar – săptămâna 1.pdf",
        kind: "pdf",
        mimeType: "application/pdf",
      },
    });

    // act
    const response = await controller.download(servingArgs(), RESOURCE_ID);

    // assert
    expect(response.status).toBe(200);
    expect(Object.fromEntries(response.headers)).toEqual({
      "cache-control": "private, no-store",
      "content-disposition": `attachment; filename="Plan alimentar _ s_pt_m_na 1.pdf"; filename*=UTF-8''${encodeURIComponent(
        "Plan alimentar – săptămâna 1.pdf",
      )}`,
      "content-length": String(PDF_BYTES.byteLength),
      "content-security-policy": "sandbox; default-src 'none'",
      "content-type": "application/pdf",
      "x-content-type-options": "nosniff",
    });
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(PDF_BYTES);
    expect(downloadClientResource).toHaveBeenCalledWith({
      requester: { role: "COACH", authSubjectId: "user_eli" },
      resourceId: RESOURCE_ID,
    });
  });

  it("answers not found to a resource the coach cannot open", async () => {
    // arrange
    const { controller } = createController({
      downloaded: { status: "not-found" },
    });

    // act
    const response = await controller.download(servingArgs(), RESOURCE_ID);

    // assert
    expect(response.status).toBe(404);
  });

  it("answers not found to a resource id that is not a uuid without opening anything", async () => {
    // arrange
    const { controller, downloadClientResource } = createController();

    // act
    const response = await controller.download(servingArgs(), "not-a-uuid");

    // assert
    expect(response.status).toBe(404);
    expect(downloadClientResource).not.toHaveBeenCalled();
  });

  it.each([
    { who: "a signed-in client", session: CLIENT_SESSION, status: 403 },
    {
      who: "a visitor who is not signed in",
      session: ANONYMOUS_SESSION,
      status: 401,
    },
  ])("refuses $who without opening anything", async ({ session, status }) => {
    // arrange
    const { controller, downloadClientResource } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.download(servingArgs({ session }), RESOURCE_ID),
    );

    // assert
    expect((thrown as Response).status).toBe(status);
    expect(downloadClientResource).not.toHaveBeenCalled();
  });
});

function createController(
  options: {
    added?: AddClientResourceResult;
    opened?: OpenResourcePageResult;
    downloaded?: DownloadClientResourceResult;
  } = {},
) {
  const addClientResource = vi
    .fn()
    .mockResolvedValue(options.added ?? { status: "not-found" });
  const openResourcePage = vi
    .fn()
    .mockResolvedValue(options.opened ?? { status: "not-found" });
  const downloadClientResource = vi
    .fn()
    .mockResolvedValue(options.downloaded ?? { status: "not-found" });
  const controller = new ClientResourcesController({
    addClientResource: {
      execute: addClientResource,
    } as unknown as AddClientResourceUseCase,
    openResourcePage: {
      execute: openResourcePage,
    } as unknown as OpenResourcePageUseCase,
    downloadClientResource: {
      execute: downloadClientResource,
    } as unknown as DownloadClientResourceUseCase,
  });

  return {
    controller,
    addClientResource,
    openResourcePage,
    downloadClientResource,
  };
}

function uploadForm(): FormData {
  const form = new FormData();
  form.set(
    RESOURCE_UPLOAD_PARTS.file,
    new File([PDF_BYTES], "Meal plan.pdf", { type: "application/pdf" }),
  );
  form.set(RESOURCE_UPLOAD_PARTS.title, "Meal plan");
  form.set(RESOURCE_UPLOAD_PARTS.description, "Week one");

  return form;
}

function uploadArgs(
  options: {
    form?: FormData;
    request?: Request;
    session?: ResolvedSession;
  } = {},
) {
  return createRequestArgs({
    contexts: sessionContexts(options.session),
    request:
      options.request ??
      new Request(UPLOAD_URL, { body: options.form, method: "POST" }),
  });
}

function servingArgs(options: { session?: ResolvedSession } = {}) {
  return createRequestArgs({
    contexts: sessionContexts(options.session),
    request: new Request(
      `https://evoa.fit/api/client-resources/${RESOURCE_ID}/download`,
    ),
  });
}

function sessionContexts(session?: ResolvedSession) {
  return [
    contextEntry(
      sessionContext,
      session ?? { account: COACH, kind: "authenticated" },
    ),
  ];
}

async function* chunksOf(bytes: Uint8Array): AsyncIterable<Uint8Array> {
  yield bytes.subarray(0, 2);
  yield bytes.subarray(2);
}

async function captureThrown(thunk: () => unknown): Promise<unknown> {
  try {
    await thunk();
    return undefined;
  } catch (thrown) {
    return thrown;
  }
}
