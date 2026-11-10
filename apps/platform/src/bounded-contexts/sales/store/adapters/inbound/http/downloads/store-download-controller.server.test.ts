import { Readable } from "node:stream";
import { describe, expect, it, vi } from "vitest";

import type { ResolveDownloadGrantUseCase } from "~/bounded-contexts/sales/store/domain/download-grant";
import type { ProductAssetsPort } from "~/bounded-contexts/sales/store/domain/product";

import { StoreDownloadController } from "./store-download-controller.server";

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
    const resolveDownloadGrantUseCase = {
      execute: vi.fn().mockResolvedValue({
        status: "available",
        delivery: { kind: "single", asset },
        grant: {
          expiresAt: new Date("2026-08-06T10:00:00.000Z"),
          id: 31,
          items: [
            {
              assets: [asset],
              productSlug: "hormone-harmony",
              productTitle: "Hormone Harmony",
              productTypeLabels: ["E-Books"],
              productVersionId: 11,
            },
          ],
          status: "active",
        },
      }),
    } as unknown as ResolveDownloadGrantUseCase;
    const assetStore = {
      assertReady: vi.fn(),
      openVerified: vi.fn().mockResolvedValue({
        kind: "opened",
        bytes: Readable.from([Buffer.from("guide")]),
      }),
    } satisfies ProductAssetsPort;
    const storeDownloadController = new StoreDownloadController(
      resolveDownloadGrantUseCase,
      assetStore,
      {
        appBasePath: "/eli",
        zipDeliveryStream: { create: vi.fn() },
      },
    );

    // act
    const response = await storeDownloadController.download(
      createRequest("opaque-token"),
    );

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
      const resolveDownloadGrantUseCase = {
        execute: vi.fn().mockResolvedValue({ status: "unavailable" }),
      } as unknown as ResolveDownloadGrantUseCase;
      const storeDownloadController = new StoreDownloadController(
        resolveDownloadGrantUseCase,
        createUnusedAssetStore(),
        {
          appBasePath: "/eli",
          zipDeliveryStream: { create: vi.fn() },
        },
      );

      // act
      const response = await storeDownloadController.download(
        createRequest("bad-token"),
      );

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
          productTypeLabels: ["E-Books"],
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
          productTypeLabels: ["E-Books"],
          productVersionId: 11,
        },
        {
          assets: [],
          productSlug: "empty-guide",
          productTitle: "Empty Guide",
          productTypeLabels: ["E-Books"],
          productVersionId: 12,
        },
      ],
      scenario: "mixed grant containing an empty product",
    },
  ])("refuses a $scenario without partial delivery", async ({ items }) => {
    // arrange
    const resolveDownloadGrantUseCase = {
      execute: vi.fn().mockResolvedValue({
        status: "available",
        delivery: { kind: "empty" },
        grant: {
          expiresAt: new Date("2026-08-06T10:00:00.000Z"),
          id: 31,
          items,
          status: "active",
        },
      }),
    } as unknown as ResolveDownloadGrantUseCase;
    const productAssetsPort = createUnusedAssetStore();
    const zipDeliveryStream = { create: vi.fn() };
    const storeDownloadController = new StoreDownloadController(
      resolveDownloadGrantUseCase,
      productAssetsPort,
      {
        appBasePath: "/eli",
        zipDeliveryStream,
      },
    );

    // act
    const response = await storeDownloadController.download(
      createRequest("opaque-token"),
    );

    // assert
    expect(response.status).toBe(303);
    expect(response.headers.get("Location")).toBe(
      "/store/download?unavailable=1",
    );
    expect(productAssetsPort.openVerified).not.toHaveBeenCalled();
    expect(zipDeliveryStream.create).not.toHaveBeenCalled();
  });

  it("returns a temporary recovery response when grant resolution fails", async () => {
    // arrange
    const resolveDownloadGrantUseCase = {
      execute: vi.fn().mockRejectedValue(new Error("database unavailable")),
    } as unknown as ResolveDownloadGrantUseCase;
    const storeDownloadController = new StoreDownloadController(
      resolveDownloadGrantUseCase,
      createUnusedAssetStore(),
      {
        appBasePath: "/eli",
        zipDeliveryStream: { create: vi.fn() },
      },
    );

    // act
    const response = await storeDownloadController.download(
      createRequest("opaque-token"),
    );

    // assert
    expect(response.status).toBe(503);
    const responseBody = await response.text();

    expect(responseBody).toContain("Downloads are temporarily unavailable");
    expect(responseBody).toContain('href="/eli/store"');
    expect(responseBody).not.toContain("opaque-token");
  });

  it("escapes dynamic values in the temporary recovery document", async () => {
    // arrange
    const resolveDownloadGrantUseCase = {
      execute: vi.fn().mockRejectedValue(new Error("database unavailable")),
    } as unknown as ResolveDownloadGrantUseCase;
    const storeDownloadController = new StoreDownloadController(
      resolveDownloadGrantUseCase,
      createUnusedAssetStore(),
      {
        appBasePath: '/eli" onmouseover="alert(1)',
        zipDeliveryStream: { create: vi.fn() },
      },
    );

    // act
    const response = await storeDownloadController.download(
      createRequest("opaque-token"),
    );
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
    const resolveDownloadGrantUseCase = {
      execute: vi.fn().mockResolvedValue({
        status: "available",
        delivery: { kind: "single", asset },
        grant: {
          expiresAt: new Date("2026-08-06T10:00:00.000Z"),
          id: 31,
          items: [
            {
              assets: [asset],
              productSlug: "hormone-harmony",
              productTitle: "Hormone Harmony",
              productTypeLabels: ["E-Books"],
              productVersionId: 11,
            },
          ],
          status: "active",
        },
      }),
    } as unknown as ResolveDownloadGrantUseCase;
    const assetStore = {
      assertReady: vi.fn(),
      openVerified: vi.fn().mockResolvedValue({ kind: "unavailable" }),
    } satisfies ProductAssetsPort;
    const storeDownloadController = new StoreDownloadController(
      resolveDownloadGrantUseCase,
      assetStore,
      {
        appBasePath: "/eli",
        zipDeliveryStream: { create: vi.fn() },
      },
    );

    // act
    const response = await storeDownloadController.download(
      createRequest("opaque-token"),
    );

    // assert
    expect(response.status).toBe(303);
    expect(response.headers.get("Location")).toBe(
      "/store/download?unavailable=1",
    );
  });

  it("rejects an oversized streamed body before resolving a grant", async () => {
    // arrange
    const resolveDownloadGrantUseCase = {
      execute: vi.fn(),
    } as unknown as ResolveDownloadGrantUseCase;
    const storeDownloadController = new StoreDownloadController(
      resolveDownloadGrantUseCase,
      createUnusedAssetStore(),
      {
        appBasePath: "/eli",
        zipDeliveryStream: { create: vi.fn() },
      },
    );
    const request = new Request("https://eli.example/api/store/downloads", {
      body: new URLSearchParams({
        token: "a".repeat(5 * 1024),
      }),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });

    // act
    const response = await storeDownloadController.download(request);

    // assert
    expect(request.headers.has("Content-Length")).toBe(false);
    expect(response.status).toBe(413);
    expect(resolveDownloadGrantUseCase.execute).not.toHaveBeenCalled();
    const responseBody = await response.text();

    expect(responseBody).toContain(
      "This download request could not be processed",
    );
  });

  it("answers the grant's resources with their titles and type labels in grant order, uncached", async () => {
    // arrange
    const asset = {
      assetKey: "products/hormone-harmony.pdf",
      customerFilename: "Hormone Harmony.pdf",
      mimeType: "application/pdf",
      sha256: "a".repeat(64),
      sizeBytes: 5,
    };
    const resolveDownloadGrantUseCase = {
      execute: vi.fn().mockResolvedValue({
        status: "available",
        delivery: { kind: "bundle", assets: [asset, asset] },
        grant: {
          expiresAt: new Date("2026-08-06T10:00:00.000Z"),
          id: 31,
          items: [
            {
              assets: [asset],
              productSlug: "hormone-harmony",
              productTitle: "Hormone Harmony",
              productTypeLabels: ["E-Books"],
              productVersionId: 11,
            },
            {
              assets: [asset],
              productSlug: "core-challenge",
              productTitle: "10-Day Core Challenge",
              productTypeLabels: ["Workouts", "Nutrition Plans"],
              productVersionId: 12,
            },
          ],
          status: "active",
        },
      }),
    } as unknown as ResolveDownloadGrantUseCase;
    const storeDownloadController = new StoreDownloadController(
      resolveDownloadGrantUseCase,
      createUnusedAssetStore(),
      {
        appBasePath: "/eli",
        zipDeliveryStream: { create: vi.fn() },
      },
    );

    // act
    const response = await storeDownloadController.contents(
      createRequest("opaque-token"),
    );

    // assert
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      status: "available",
      resources: [
        { title: "Hormone Harmony", typeLabels: ["E-Books"] },
        {
          title: "10-Day Core Challenge",
          typeLabels: ["Workouts", "Nutrition Plans"],
        },
      ],
    });
    expect(resolveDownloadGrantUseCase.execute).toHaveBeenCalledWith(
      "opaque-token",
    );
  });

  it.each([
    {
      scenario: "missing, expired or revoked grant",
      resolution: { status: "unavailable" },
    },
    {
      scenario: "grant with an empty product",
      resolution: {
        status: "available",
        delivery: { kind: "empty" },
        grant: {
          expiresAt: new Date("2026-08-06T10:00:00.000Z"),
          id: 31,
          items: [
            {
              assets: [],
              productSlug: "empty-guide",
              productTitle: "Empty Guide",
              productTypeLabels: [],
              productVersionId: 11,
            },
          ],
          status: "active",
        },
      },
    },
  ])(
    "answers the same privacy-safe unavailable contents for a $scenario",
    async ({ resolution }) => {
      // arrange
      const resolveDownloadGrantUseCase = {
        execute: vi.fn().mockResolvedValue(resolution),
      } as unknown as ResolveDownloadGrantUseCase;
      const storeDownloadController = new StoreDownloadController(
        resolveDownloadGrantUseCase,
        createUnusedAssetStore(),
        {
          appBasePath: "/eli",
          zipDeliveryStream: { create: vi.fn() },
        },
      );

      // act
      const response = await storeDownloadController.contents(
        createRequest("bad-token"),
      );

      // assert
      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      await expect(response.json()).resolves.toEqual({
        status: "unavailable",
      });
    },
  );

  it("answers unavailable contents for a body carrying more than the token, without resolving a grant", async () => {
    // arrange
    const resolveDownloadGrantUseCase = {
      execute: vi.fn(),
    } as unknown as ResolveDownloadGrantUseCase;
    const storeDownloadController = new StoreDownloadController(
      resolveDownloadGrantUseCase,
      createUnusedAssetStore(),
      {
        appBasePath: "/eli",
        zipDeliveryStream: { create: vi.fn() },
      },
    );
    const formData = new FormData();
    formData.set("token", "opaque-token");
    formData.set("extra", "value");

    // act
    const response = await storeDownloadController.contents(
      new Request("https://eli.example/api/store/downloads/contents", {
        body: formData,
        method: "POST",
      }),
    );

    // assert
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "unavailable" });
    expect(resolveDownloadGrantUseCase.execute).not.toHaveBeenCalled();
  });

  it("answers temporary unavailability for the contents when grant resolution fails", async () => {
    // arrange
    const resolveDownloadGrantUseCase = {
      execute: vi.fn().mockRejectedValue(new Error("database unavailable")),
    } as unknown as ResolveDownloadGrantUseCase;
    const storeDownloadController = new StoreDownloadController(
      resolveDownloadGrantUseCase,
      createUnusedAssetStore(),
      {
        appBasePath: "/eli",
        zipDeliveryStream: { create: vi.fn() },
      },
    );

    // act
    const response = await storeDownloadController.contents(
      createRequest("opaque-token"),
    );

    // assert
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      status: "temporarily_unavailable",
    });
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

function createUnusedAssetStore(): ProductAssetsPort {
  return {
    assertReady: vi.fn(),
    openVerified: vi.fn(),
  };
}
