import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createUploadProgress } from "./upload-progress";
import { uploadOutcomeOf } from "./upload-transport";

const UPLOAD_URL = "http://localhost/api/uploads";

class FakeXmlHttpRequest extends EventTarget {
  static sent: FakeXmlHttpRequest[] = [];

  readonly upload = new EventTarget();
  readonly requestHeaders = new Map<string, string>();
  method = "";
  url = "";
  body: unknown = null;
  status = 0;
  responseText = "";
  aborted = false;
  private responseContentType: string | null = null;

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(name: string, value: string) {
    this.requestHeaders.set(name, value);
  }

  getResponseHeader(name: string): string | null {
    return name.toLowerCase() === "content-type"
      ? this.responseContentType
      : null;
  }

  send(body: unknown) {
    this.body = body;
    FakeXmlHttpRequest.sent.push(this);
  }

  abort() {
    this.aborted = true;
    this.dispatchEvent(new Event("abort"));
    this.dispatchEvent(new Event("loadend"));
  }

  reportBytesSent(loaded: number, total: number) {
    this.upload.dispatchEvent(
      Object.assign(new Event("progress"), {
        lengthComputable: true,
        loaded,
        total,
      }),
    );
  }

  finishSending() {
    this.upload.dispatchEvent(new Event("load"));
  }

  respond(options: { status: number; body?: string; contentType?: string }) {
    this.status = options.status;
    this.responseText = options.body ?? "";
    this.responseContentType = options.contentType ?? null;
    this.dispatchEvent(new Event("load"));
    this.dispatchEvent(new Event("loadend"));
  }

  failNetwork() {
    this.dispatchEvent(new Event("error"));
    this.dispatchEvent(new Event("loadend"));
  }
}

function uploadRequest(signal?: AbortSignal): Request {
  const formData = new FormData();
  formData.append("title", "Meal plan");
  formData.append(
    "file",
    new File(["%PDF-1.7"], "plan.pdf", { type: "application/pdf" }),
  );

  return new Request(UPLOAD_URL, { body: formData, method: "POST", signal });
}

async function sentUpload(): Promise<FakeXmlHttpRequest> {
  await vi.waitFor(() => expect(FakeXmlHttpRequest.sent).toHaveLength(1));

  return FakeXmlHttpRequest.sent[0];
}

describe("uploadOutcomeOf", () => {
  beforeEach(() => {
    FakeXmlHttpRequest.sent = [];
    vi.stubGlobal("XMLHttpRequest", FakeXmlHttpRequest);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts the fetcher's multipart body unchanged to the route's URL", async () => {
    // arrange
    const request = uploadRequest();
    const expectedBody = await request.clone().text();
    const progress = createUploadProgress();

    // act
    const outcome = uploadOutcomeOf(request, progress);
    const upload = await sentUpload();
    upload.respond({
      body: "{}",
      contentType: "application/json",
      status: 201,
    });
    await outcome;

    // assert
    expect(upload.method).toBe("POST");
    expect(upload.url).toBe(UPLOAD_URL);
    expect(upload.requestHeaders.get("Content-Type")).toBe(
      request.headers.get("Content-Type"),
    );
    expect(upload.body).toBeInstanceOf(Blob);
    await expect((upload.body as Blob).text()).resolves.toBe(expectedBody);
  });

  it("reports how far the bytes have got while they are sent", async () => {
    // arrange
    const progress = createUploadProgress();
    void uploadOutcomeOf(uploadRequest(), progress);
    const upload = await sentUpload();
    const startedAt = progress.getSnapshot();

    // act
    upload.reportBytesSent(256, 1024);

    // assert
    expect(startedAt).toEqual({ fraction: 0, phase: "sending" });
    expect(progress.getSnapshot()).toEqual({
      fraction: 0.25,
      phase: "sending",
    });
  });

  it("tells subscribers each time the sent bytes move", async () => {
    // arrange
    const progress = createUploadProgress();
    void uploadOutcomeOf(uploadRequest(), progress);
    const upload = await sentUpload();
    const seen: number[] = [];
    progress.subscribe(() => seen.push(progress.getSnapshot().fraction));

    // act
    upload.reportBytesSent(512, 1024);
    upload.reportBytesSent(1024, 1024);

    // assert
    expect(seen).toEqual([0.5, 1]);
  });

  it("is sent from the last byte until the server answers", async () => {
    // arrange
    const progress = createUploadProgress();
    void uploadOutcomeOf(uploadRequest(), progress);
    const upload = await sentUpload();
    upload.reportBytesSent(1024, 1024);

    // act
    upload.finishSending();

    // assert
    expect(progress.getSnapshot()).toEqual({ fraction: 1, phase: "sent" });
  });

  it("passes the server's answer through when it accepts the upload", async () => {
    // arrange
    const progress = createUploadProgress();
    const outcome = uploadOutcomeOf(uploadRequest(), progress);
    const upload = await sentUpload();

    // act
    upload.respond({
      body: JSON.stringify({ resource: { id: "r-1", title: "Meal plan" } }),
      contentType: "application/json; charset=utf-8",
      status: 201,
    });

    // assert
    await expect(outcome).resolves.toEqual({
      resource: { id: "r-1", title: "Meal plan" },
    });
  });

  it("answers nothing for an answer with no content", async () => {
    // arrange
    const progress = createUploadProgress();
    const outcome = uploadOutcomeOf(uploadRequest(), progress);
    const upload = await sentUpload();

    // act
    upload.respond({ status: 204 });

    // assert
    await expect(outcome).resolves.toBeUndefined();
  });

  it("keeps a refusal's reasons at its status so the page is not re-read", async () => {
    // arrange
    const progress = createUploadProgress();
    const outcome = uploadOutcomeOf(uploadRequest(), progress);
    const upload = await sentUpload();

    // act
    upload.respond({
      body: JSON.stringify({ refusal: "too-many-pages" }),
      contentType: "application/json",
      status: 422,
    });

    // assert
    const response = (await outcome) as Response;
    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      refusal: "too-many-pages",
    });
  });

  it("answers a refusal without reasons as refused at its status", async () => {
    // arrange
    const progress = createUploadProgress();
    const outcome = uploadOutcomeOf(uploadRequest(), progress);
    const upload = await sentUpload();

    // act
    upload.respond({
      body: "Internal Server Error",
      contentType: "text/plain",
      status: 500,
    });

    // assert
    const response = (await outcome) as Response;
    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      httpStatus: 500,
      status: "refused",
    });
  });

  it("answers an answer it cannot read as unreachable", async () => {
    // arrange
    const progress = createUploadProgress();
    const outcome = uploadOutcomeOf(uploadRequest(), progress);
    const upload = await sentUpload();

    // act
    upload.respond({
      body: "<html>gateway</html>",
      contentType: "text/html",
      status: 200,
    });

    // assert
    const response = (await outcome) as Response;
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ status: "unreachable" });
  });

  it("answers a network failure as unreachable", async () => {
    // arrange
    const progress = createUploadProgress();
    const outcome = uploadOutcomeOf(uploadRequest(), progress);
    const upload = await sentUpload();

    // act
    upload.failNetwork();

    // assert
    const response = (await outcome) as Response;
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ status: "unreachable" });
  });

  it("stops sending when the router abandons the submission", async () => {
    // arrange
    const abandon = new AbortController();
    const progress = createUploadProgress();
    const outcome = uploadOutcomeOf(uploadRequest(abandon.signal), progress);
    const upload = await sentUpload();

    // act
    abandon.abort();

    // assert
    expect(upload.aborted).toBe(true);
    const response = (await outcome) as Response;
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ status: "unreachable" });
  });

  it("sends nothing for a submission already abandoned", async () => {
    // arrange
    const abandon = new AbortController();
    abandon.abort();
    const progress = createUploadProgress();

    // act
    const response = (await uploadOutcomeOf(
      uploadRequest(abandon.signal),
      progress,
    )) as Response;

    // assert
    expect(FakeXmlHttpRequest.sent).toHaveLength(0);
    expect(response.status).toBe(503);
    expect(progress.getSnapshot()).toEqual({ fraction: 0, phase: "idle" });
  });

  it("is idle again once the server answers, ready for the next upload", async () => {
    // arrange
    const progress = createUploadProgress();
    const first = uploadOutcomeOf(uploadRequest(), progress);
    const firstUpload = await sentUpload();
    firstUpload.reportBytesSent(1024, 1024);
    firstUpload.finishSending();
    firstUpload.respond({
      body: JSON.stringify({ refusal: "unreadable" }),
      contentType: "application/json",
      status: 422,
    });
    await first;
    const afterFirst = progress.getSnapshot();

    // act
    void uploadOutcomeOf(uploadRequest(), progress);

    // assert
    expect(afterFirst).toEqual({ fraction: 0, phase: "idle" });
    expect(progress.getSnapshot()).toEqual({ fraction: 0, phase: "sending" });
    await vi.waitFor(() => expect(FakeXmlHttpRequest.sent).toHaveLength(2));
  });

  it("hands out the same snapshot until the progress moves", async () => {
    // arrange
    const progress = createUploadProgress();
    void uploadOutcomeOf(uploadRequest(), progress);
    const upload = await sentUpload();
    upload.reportBytesSent(400, 1000);
    const before = progress.getSnapshot();

    // act
    const reread = progress.getSnapshot();
    upload.reportBytesSent(400, 1000);
    const afterSameBytes = progress.getSnapshot();
    upload.reportBytesSent(600, 1000);
    const moved = progress.getSnapshot();

    // assert
    expect(reread).toBe(before);
    expect(afterSameBytes).toBe(before);
    expect(moved).not.toBe(before);
  });

  it("stops telling a subscriber once it unsubscribes", async () => {
    // arrange
    const progress = createUploadProgress();
    void uploadOutcomeOf(uploadRequest(), progress);
    const upload = await sentUpload();
    let notifications = 0;
    const unsubscribe = progress.subscribe(() => {
      notifications += 1;
    });
    upload.reportBytesSent(100, 1000);

    // act
    unsubscribe();
    upload.reportBytesSent(900, 1000);
    upload.finishSending();

    // assert
    expect(notifications).toBe(1);
  });

  it("keeps two features' uploads apart", async () => {
    // arrange
    const resources = createUploadProgress();
    const photos = createUploadProgress();
    void uploadOutcomeOf(uploadRequest(), resources);
    const upload = await sentUpload();

    // act
    upload.reportBytesSent(500, 1000);

    // assert
    expect(resources.getSnapshot()).toEqual({
      fraction: 0.5,
      phase: "sending",
    });
    expect(photos.getSnapshot()).toEqual({ fraction: 0, phase: "idle" });
  });

  it("is idle again after a network failure", async () => {
    // arrange
    const progress = createUploadProgress();
    const outcome = uploadOutcomeOf(uploadRequest(), progress);
    const upload = await sentUpload();
    upload.reportBytesSent(300, 1024);

    // act
    upload.failNetwork();
    await outcome;

    // assert
    expect(progress.getSnapshot()).toEqual({ fraction: 0, phase: "idle" });
  });
});
