import { Readable } from "node:stream";
import { describe, expect, it, vi } from "vitest";

import {
  StoredFileUnavailableError,
  type DownloadGrantService,
  type VerifiedFileReader,
} from "@eli-coach-platform/domain";

import { StoreDownloadController } from "./downloads-controller.server";

describe("StoreDownloadController", () => {
  it("streams a single verified asset with its customer-facing filename", async () => {
    // arrange
    const asset = {
      assetKey: "products/hormone-harmony.pdf",
      customerFilename: "Hormone Harmony.pdf",
      mimeType: "application/pdf",
      sha256: "a".repeat(64),
      sizeBytes: 5,
    };
    const grantService = {
      resolve: vi.fn().mockResolvedValue({
        status: "available",
        grant: {
          expiresAt: new Date("2026-08-06T10:00:00.000Z"),
          id: 31,
          items: [
            {
              assets: [asset],
              productSlug: "hormone-harmony",
              productTitle: "Hormone Harmony",
              productVersionId: 11,
            },
          ],
          status: "active",
        },
      }),
    } as unknown as DownloadGrantService;
    const assetStore = {
      assertReady: vi.fn(),
      openVerified: vi
        .fn()
        .mockResolvedValue(Readable.from([Buffer.from("guide")])),
    } satisfies VerifiedFileReader;
    const controller = new StoreDownloadController(
      grantService,
      assetStore,
      {
        appBasePath: "/eli",
        zipDeliveryStream: { create: vi.fn() },
      },
    );

    // act
    const response = await controller.download(createRequest("opaque-token"));

    // assert
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toContain(
      'filename="Hormone Harmony.pdf"',
    );
    await expect(response.text()).resolves.toBe("guide");
  });

  it.each(["missing", "expired", "revoked"])(
    "uses the same privacy-safe response for a %s grant",
    async () => {
      // arrange
      const grantService = {
        resolve: vi.fn().mockResolvedValue({ status: "unavailable" }),
      } as unknown as DownloadGrantService;
      const controller = new StoreDownloadController(
        grantService,
        createUnusedAssetStore(),
        {
          appBasePath: "/eli",
          zipDeliveryStream: { create: vi.fn() },
        },
      );

      // act
      const response = await controller.download(createRequest("bad-token"));

      // assert
      expect(response.status).toBe(303);
      expect(response.headers.get("Location")).toBe(
        "/store/download?unavailable=1",
      );
    },
  );

  it.each([
    {
      items: [
        {
          assets: [],
          productSlug: "empty-guide",
          productTitle: "Empty Guide",
          productVersionId: 11,
        },
      ],
      scenario: "zero-asset grant",
    },
    {
      items: [
        {
          assets: [
            {
              assetKey: "products/guide.pdf",
              customerFilename: "Guide.pdf",
              mimeType: "application/pdf",
              sha256: "a".repeat(64),
              sizeBytes: 5,
            },
          ],
          productSlug: "guide",
          productTitle: "Guide",
          productVersionId: 11,
        },
        {
          assets: [],
          productSlug: "empty-guide",
          productTitle: "Empty Guide",
          productVersionId: 12,
        },
      ],
      scenario: "mixed grant containing an empty product",
    },
  ])("refuses a $scenario without partial delivery", async ({ items }) => {
    // arrange
    const grantService = {
      resolve: vi.fn().mockResolvedValue({
        status: "available",
        grant: {
          expiresAt: new Date("2026-08-06T10:00:00.000Z"),
          id: 31,
          items,
          status: "active",
        },
      }),
    } as unknown as DownloadGrantService;
    const assetStore = createUnusedAssetStore();
    const zipDeliveryStream = { create: vi.fn() };
    const controller = new StoreDownloadController(
      grantService,
      assetStore,
      {
        appBasePath: "/eli",
        zipDeliveryStream,
      },
    );

    // act
    const response = await controller.download(createRequest("opaque-token"));

    // assert
    expect(response.status).toBe(303);
    expect(response.headers.get("Location")).toBe(
      "/store/download?unavailable=1",
    );
    expect(assetStore.openVerified).not.toHaveBeenCalled();
    expect(zipDeliveryStream.create).not.toHaveBeenCalled();
  });

  it("returns a temporary recovery response when grant resolution fails", async () => {
    // arrange
    const grantService = {
      resolve: vi.fn().mockRejectedValue(new Error("database unavailable")),
    } as unknown as DownloadGrantService;
    const controller = new StoreDownloadController(
      grantService,
      createUnusedAssetStore(),
      {
        appBasePath: "/eli",
        zipDeliveryStream: { create: vi.fn() },
      },
    );

    // act
    const response = await controller.download(createRequest("opaque-token"));

    // assert
    expect(response.status).toBe(503);
    const responseBody = await response.text();

    expect(responseBody).toContain("Downloads are temporarily unavailable");
    expect(responseBody).toContain('href="/eli/store"');
    expect(responseBody).not.toContain("opaque-token");
  });

  it("escapes dynamic values in the temporary recovery document", async () => {
    // arrange
    const grantService = {
      resolve: vi.fn().mockRejectedValue(new Error("database unavailable")),
    } as unknown as DownloadGrantService;
    const controller = new StoreDownloadController(
      grantService,
      createUnusedAssetStore(),
      {
        appBasePath: '/eli" onmouseover="alert(1)',
        zipDeliveryStream: { create: vi.fn() },
      },
    );

    // act
    const response = await controller.download(createRequest("opaque-token"));
    const responseBody = await response.text();

    // assert
    expect(responseBody).toContain(
      'href="/eli&quot; onmouseover=&quot;alert(1)/store"',
    );
    expect(responseBody).not.toContain('href="/eli" onmouseover=');
    expect(responseBody).not.toMatch(/{{[A-Z_]+}}/);
  });

  it("uses the privacy-safe unavailable response for a missing asset", async () => {
    // arrange
    const asset = {
      assetKey: "products/hormone-harmony.pdf",
      customerFilename: "Hormone Harmony.pdf",
      mimeType: "application/pdf",
      sha256: "a".repeat(64),
      sizeBytes: 5,
    };
    const grantService = {
      resolve: vi.fn().mockResolvedValue({
        status: "available",
        grant: {
          expiresAt: new Date("2026-08-06T10:00:00.000Z"),
          id: 31,
          items: [
            {
              assets: [asset],
              productSlug: "hormone-harmony",
              productTitle: "Hormone Harmony",
              productVersionId: 11,
            },
          ],
          status: "active",
        },
      }),
    } as unknown as DownloadGrantService;
    const assetStore = {
      assertReady: vi.fn(),
      openVerified: vi
        .fn()
        .mockRejectedValue(new StoredFileUnavailableError()),
    } satisfies VerifiedFileReader;
    const controller = new StoreDownloadController(
      grantService,
      assetStore,
      {
        appBasePath: "/eli",
        zipDeliveryStream: { create: vi.fn() },
      },
    );

    // act
    const response = await controller.download(createRequest("opaque-token"));

    // assert
    expect(response.status).toBe(303);
    expect(response.headers.get("Location")).toBe(
      "/store/download?unavailable=1",
    );
  });

  it("rejects an oversized streamed body before resolving a grant", async () => {
    // arrange
    const grantService = {
      resolve: vi.fn(),
    } as unknown as DownloadGrantService;
    const controller = new StoreDownloadController(
      grantService,
      createUnusedAssetStore(),
      {
        appBasePath: "/eli",
        zipDeliveryStream: { create: vi.fn() },
      },
    );
    const request = new Request(
      "https://eli.example/api/store/downloads",
      {
        body: new URLSearchParams({
          token: "a".repeat(5 * 1024),
        }),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        method: "POST",
      },
    );

    // act
    const response = await controller.download(request);

    // assert
    expect(request.headers.has("Content-Length")).toBe(false);
    expect(response.status).toBe(413);
    expect(grantService.resolve).not.toHaveBeenCalled();
    const responseBody = await response.text();

    expect(responseBody).toContain(
      "This download request could not be processed",
    );
  });
});

function createRequest(token: string): Request {
  const formData = new FormData();
  formData.set("token", token);

  return new Request("https://eli.example/api/store/downloads", {
    body: formData,
    method: "POST",
  });
}

function createUnusedAssetStore(): VerifiedFileReader {
  return {
    assertReady: vi.fn(),
    openVerified: vi.fn(),
  };
}
