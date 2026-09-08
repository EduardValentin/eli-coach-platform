// @vitest-environment jsdom

import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { downloadOwnedProduct } from "./owned-product-download";

const server = setupServer();

type SavedFile = {
  download: string;
  href: string;
};

const savedFiles: SavedFile[] = [];
const revokedObjectUrls: string[] = [];

beforeAll(() => {
  // jsdom implements neither half of the object-URL pair the browser hands a
  // blob download, so the test provides them and records what was released.
  URL.createObjectURL = () => "blob:library-download";
  URL.revokeObjectURL = (objectUrl: string) => {
    revokedObjectUrls.push(objectUrl);
  };
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
    function captureSave(this: HTMLAnchorElement) {
      savedFiles.push({ download: this.download, href: this.href });
    },
  );
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(async () => {
  await flushPendingObjectUrlReleases();
  savedFiles.length = 0;
  revokedObjectUrls.length = 0;
  server.resetHandlers();
  vi.unstubAllEnvs();
});

afterAll(() => {
  vi.restoreAllMocks();
  server.close();
});

// The object URL is released a task after the save starts, so each case's
// release has to land before the next one reads the recording.
function flushPendingObjectUrlReleases() {
  return new Promise((settleAfterPendingTasks) => {
    setTimeout(settleAfterPendingTasks, 0);
  });
}

describe("owned product download", () => {
  it("saves a single asset under the filename the server encoded", async () => {
    // arrange
    stubDownload({
      contentDisposition:
        "attachment; filename=\"Hormone Harmony.pdf\"; filename*=UTF-8''Hormone%20Harmony%20%E2%80%93%20guide.pdf",
    });

    // act
    await downloadOwnedProduct("hormone-harmony");

    // assert
    expect(savedFiles).toEqual([
      { download: "Hormone Harmony – guide.pdf", href: "blob:library-download" },
    ]);
  });

  it("falls back to the plain filename when the server sends only that", async () => {
    // arrange
    stubDownload({
      contentDisposition: 'attachment; filename="hormone-harmony.zip"',
    });

    // act
    await downloadOwnedProduct("hormone-harmony");

    // assert
    expect(savedFiles.map((file) => file.download)).toEqual([
      "hormone-harmony.zip",
    ]);
  });

  it("names the file after the product when the server names nothing", async () => {
    // arrange
    stubDownload({});

    // act
    await downloadOwnedProduct("hormone-harmony");

    // assert
    expect(savedFiles.map((file) => file.download)).toEqual([
      "hormone-harmony",
    ]);
  });

  it("releases the object URL it created, once the save is under way", async () => {
    // arrange
    stubDownload({ contentDisposition: 'attachment; filename="guide.pdf"' });

    // act
    await downloadOwnedProduct("hormone-harmony");

    // assert
    expect(revokedObjectUrls).toEqual([]);
    await vi.waitFor(() => {
      expect(revokedObjectUrls).toEqual(["blob:library-download"]);
    });
  });

  it("asks the deployed base path for the download, never the bare origin", async () => {
    // arrange
    vi.stubEnv("BASE_URL", "/eli-coach-platform/");
    const requestedPaths: string[] = [];
    server.use(
      http.get("/eli-coach-platform/api/store/library/:slug/download", ({ request }) => {
        requestedPaths.push(new URL(request.url).pathname);

        return HttpResponse.text("bytes");
      }),
    );

    // act
    await downloadOwnedProduct("hormone-harmony");

    // assert
    expect(requestedPaths).toEqual([
      "/eli-coach-platform/api/store/library/hormone-harmony/download",
    ]);
  });

  it("asks for the product by its escaped slug, with the session cookie", async () => {
    // arrange
    const requestedUrls: string[] = [];
    const requestCredentials: RequestCredentials[] = [];
    server.use(
      http.get("/api/store/library/:slug/download", ({ request }) => {
        requestedUrls.push(new URL(request.url).pathname);
        requestCredentials.push(request.credentials);

        return HttpResponse.text("bytes");
      }),
    );

    // act
    await downloadOwnedProduct("hormone harmony/../secret");

    // assert
    expect(requestedUrls).toEqual([
      "/api/store/library/hormone%20harmony%2F..%2Fsecret/download",
    ]);
    expect(requestCredentials).toEqual(["same-origin"]);
  });

  it("saves nothing when the download is refused", async () => {
    // arrange
    server.use(
      http.get("/api/store/library/:slug/download", () =>
        HttpResponse.json({ error: "temporarily_unavailable" }, { status: 503 }),
      ),
    );

    // act
    const downloading = downloadOwnedProduct("hormone-harmony");

    // assert
    await expect(downloading).rejects.toThrow(/503/);
    expect(savedFiles).toEqual([]);
  });
});

function stubDownload(options: { contentDisposition?: string }) {
  server.use(
    http.get("/api/store/library/:slug/download", () =>
      HttpResponse.text(
        "bytes",
        options.contentDisposition
          ? { headers: { "Content-Disposition": options.contentDisposition } }
          : undefined,
      ),
    ),
  );
}
