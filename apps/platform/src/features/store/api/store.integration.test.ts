import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { TURNSTILE_TEST_RESPONSE_TOKEN } from "@eli-coach-platform/config";
import {
  PRIVACY_POLICY_VERSION,
  STORE_MARKETING_CONSENT_VERSION,
  WEBSITE_AND_STORE_TERMS_DOCUMENT,
} from "@eli-coach-platform/content";
import type { RouteConfigEntry } from "@react-router/dev/routes";
import {
  DownloadGrantService,
  StoreAcquisitionService,
  StoreDeliveryRejectedError,
  type StoreAcquisitionRepository,
  type StoreCatalogRepository,
  type StoreDeliveryService,
} from "@eli-coach-platform/domain";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { createStaticHandler } from "react-router";

import { StaticTokenBotVerifier } from "@eli-coach-platform/infrastructure/bot-detection/server";
import { PostgresStoreAcquisitionRepository } from "~/features/store/data/acquisition-repository.server";
import { PostgresStoreCatalogRepository } from "~/features/store/data/catalog-repository.server";
import { PostgresDownloadGrantRepository } from "~/features/store/data/download-grant-repository.server";
import { FilesystemProductAssetStore } from "~/features/store/data/asset-store.server";
import {
  DownloadTokenSha256,
  PayloadSha256Digest,
} from "~/features/store/data/download-token.server";
import { StoreAcquisitionController } from "./acquisitions-controller.server";
import { StoreDownloadController } from "./downloads-controller.server";
import { ZipDeliveryStream } from "./zip-stream.server";
import appRoutes from "~/routes";
import * as acquisitionsRoute from "./acquisitions";
import * as catalogRoute from "./catalog";
import * as coverRoute from "./covers";
import * as downloadsRoute from "./downloads";
import type { PlatformContainer } from "~/server/container.server";
import { PlatformIntegrationTestContext } from "~test-support/platform-integration-test-context";

const routePlatformContainer = vi.hoisted(() => ({
  current: null as unknown,
}));

vi.mock("~/server/container.server", async (importOriginal) => {
  const original =
    await importOriginal<
      typeof import("~/server/container.server")
    >();

  return {
    ...original,
    getPlatformContainer() {
      if (!routePlatformContainer.current) {
        throw new Error("Store route integration container is not ready.");
      }

      return routePlatformContainer.current;
    },
  };
});

const integrationTestContext = new PlatformIntegrationTestContext();
const fixedNow = new Date("2026-07-30T12:00:00.000Z");
const integrationBasePath = "/eli-coach-platform";
const storeRouteHandler = createStoreRouteHandler();

describe.sequential("Store integration", () => {
  beforeAll(async () => {
    await integrationTestContext.start();
    await integrationTestContext.resetToBaselineState();
    routePlatformContainer.current =
      integrationTestContext.getPlatformContainer();
  });

  afterEach(async () => {
    await integrationTestContext.resetToBaselineState();
    routePlatformContainer.current =
      integrationTestContext.getPlatformContainer();
  });

  afterAll(async () => {
    routePlatformContainer.current = null;
    await integrationTestContext.stop();
  });

  it("serves the live catalog and only verified published cover bytes", async () => {
    // arrange
    const fixture = await seedPublishedProductVersion();

    // act
    const catalogResponse = await requestRegisteredStoreRoute(
      new Request(
        `http://localhost${integrationBasePath}/api/store/catalog`,
      ),
    );
    const catalog = (await catalogResponse.json()) as {
      products: { cover: { url: string } }[];
    };
    const coverResponse = await requestRegisteredStoreRoute(
      new Request(`http://localhost${catalog.products[0]!.cover.url}`),
    );
    await seedNextPublishedVersion();
    const previousVersionCoverResponse =
      await requestRegisteredStoreRoute(
        new Request(`http://localhost${catalog.products[0]!.cover.url}`),
      );
    const rejectedCatalogMutation = await requestRegisteredStoreRoute(
      new Request(
        `http://localhost${integrationBasePath}/api/store/catalog`,
        { method: "POST" },
      ),
    );

    // assert
    expect(catalogResponse.status).toBe(200);
    expect(catalog).toMatchObject({
      products: [
        {
          cover: {
            alt: "Hormone Harmony guide cover",
            url: `${integrationBasePath}/api/store/covers/${encodeURIComponent(
              fixture.coverAssetKey,
            )}`,
          },
          slug: "hormone-harmony",
          title: "Hormone Harmony",
        },
      ],
      success: true,
    });
    expect(coverResponse.status).toBe(200);
    expect(previousVersionCoverResponse.status).toBe(200);
    expect(rejectedCatalogMutation.status).toBe(405);
    expect(rejectedCatalogMutation.headers.get("Allow")).toBe("GET, HEAD");
    await expect(coverResponse.text()).resolves.toBe("cover-version-one");
    await expect(previousVersionCoverResponse.text()).resolves.toBe(
      "cover-version-one",
    );
  });

  it("returns temporary unavailability for tampered published cover bytes", async () => {
    // arrange
    const fixture = await seedPublishedProductVersion();
    await writeFile(
      join(integrationTestContext.getStoreAssetRoot(), fixture.coverAssetKey),
      "tampered-cover",
    );
    const coverUrl = `${integrationBasePath}/api/store/covers/${encodeURIComponent(
      fixture.coverAssetKey,
    )}`;

    // act
    const tamperedCoverResponse = await requestRegisteredStoreRoute(
      new Request(`http://localhost${coverUrl}`),
    );

    // assert
    expect(tamperedCoverResponse.status).toBe(503);
  });

  it("persists consent and pinned grants atomically, deduplicates technical retries, and supports deliberate re-delivery", async () => {
    // arrange
    await seedPublishedProductVersion();
    const sentDeliveries: {
      email: string;
      rawToken: string;
      requestId: number;
    }[] = [];
    const issuedTokens = [
      "grant-token-one",
      "grant-token-two",
    ];
    let acquisitionNow = fixedNow;
    const controller = createAcquisitionController({
      issuedTokens,
      now: () => acquisitionNow,
      onDelivery: (delivery) => {
        sentDeliveries.push(delivery);
      },
    });
    routePlatformContainer.current = {
      ...integrationTestContext.getPlatformContainer(),
      storeAcquisitionController: controller,
      storeDownloadController: createDownloadController(fixedNow),
    } satisfies PlatformContainer;
    const firstRequest = createAcquisitionRequest({
      idempotencyKey: "d744ad8e-632c-4dfe-ac70-033bd3221522",
    });

    // act
    const firstResponse = await requestRegisteredStoreRoute(firstRequest);
    acquisitionNow = new Date(fixedNow.getTime() + 2 * 60 * 1000);
    const deliberateRedeliveryResponse = await requestRegisteredStoreRoute(
      createAcquisitionRequest({
        idempotencyKey: "2e15d596-66b4-4892-8fa2-6f0f25896605",
      }),
    );
    await integrationTestContext.executeSql({
      sql: `
        update app.products
        set lifecycle_status = 'archived'
        where slug = 'hormone-harmony'
      `,
      values: [],
    });
    const technicalRetryResponse = await requestRegisteredStoreRoute(
      createAcquisitionRequest({
        idempotencyKey: "d744ad8e-632c-4dfe-ac70-033bd3221522",
      }),
    );

    // assert
    expect(firstResponse.status).toBe(201);
    expect(technicalRetryResponse.status).toBe(201);
    expect(deliberateRedeliveryResponse.status).toBe(201);
    expect(sentDeliveries).toHaveLength(2);
    expect(sentDeliveries.map((delivery) => delivery.rawToken)).toEqual([
      "grant-token-one",
      "grant-token-two",
    ]);
    const evidence = await integrationTestContext.queryRows<{
      normalizedEmail: string;
      requestCount: number;
      termsVersion: string;
      privacyPolicyVersion: string;
      marketingConsentVersion: string;
      marketingConsent: boolean;
      marketingConsentedAt: Date | null;
      requestRows: number;
      grantRows: number;
      grantItemRows: number;
      acceptedAttempts: number;
    }>({
      sql: `
        select
          recipient.normalized_email as "normalizedEmail",
          acquisition.request_count as "requestCount",
          min(request.terms_version) as "termsVersion",
          min(request.privacy_policy_version) as "privacyPolicyVersion",
          min(request.marketing_consent_version) as "marketingConsentVersion",
          bool_and(request.marketing_consent) as "marketingConsent",
          min(request.marketing_consented_at) as "marketingConsentedAt",
          count(distinct request.id)::int as "requestRows",
          count(distinct download_grant.id)::int as "grantRows",
          count(distinct grant_item.grant_id)::int as "grantItemRows",
          count(distinct delivery.id) filter (
            where delivery.status = 'accepted'
          )::int as "acceptedAttempts"
        from app.store_recipients recipient
        join app.acquisitions acquisition
          on acquisition.recipient_id = recipient.id
        join app.acquisition_requests request
          on request.recipient_id = recipient.id
        join app.download_grants download_grant
          on download_grant.request_id = request.id
        join app.download_grant_items grant_item
          on grant_item.grant_id = download_grant.id
        join app.delivery_attempts delivery
          on delivery.request_id = request.id
        group by recipient.normalized_email, acquisition.request_count
      `,
      values: [],
    });

    expect(evidence).toEqual([
      expect.objectContaining({
        acceptedAttempts: 2,
        grantItemRows: 2,
        grantRows: 2,
        marketingConsent: true,
        marketingConsentVersion: STORE_MARKETING_CONSENT_VERSION,
        normalizedEmail: "woman@example.com",
        privacyPolicyVersion: PRIVACY_POLICY_VERSION,
        requestCount: 2,
        requestRows: 2,
        termsVersion: WEBSITE_AND_STORE_TERMS_DOCUMENT.version,
      }),
    ]);
    expect(evidence[0]?.marketingConsentedAt).toBeInstanceOf(Date);

    await seedNextPublishedVersion();
    const firstDownload = await requestRegisteredStoreRoute(
      createDownloadRequest("grant-token-one"),
    );
    const repeatedDownload = await requestRegisteredStoreRoute(
      createDownloadRequest("grant-token-one"),
    );
    const firstArchive = Buffer.from(await firstDownload.arrayBuffer());
    const repeatedArchive = Buffer.from(await repeatedDownload.arrayBuffer());

    expect(firstDownload.status).toBe(200);
    expect(firstDownload.headers.get("Content-Type")).toBe("application/zip");
    expect(firstArchive.subarray(0, 2).toString()).toBe("PK");
    expect(firstArchive.toString("binary")).toContain(
      "hormone-harmony/Hormone Harmony.pdf",
    );
    expect(firstArchive.toString("binary")).toContain(
      "hormone-harmony/Meal Plan.txt",
    );
    expect(firstArchive.toString("binary")).not.toContain(
      "New Edition.pdf",
    );
    expect(repeatedDownload.status).toBe(200);
    expect(repeatedArchive.subarray(0, 2).toString()).toBe("PK");
    expect(repeatedArchive.toString("binary")).toContain(
      "hormone-harmony/Hormone Harmony.pdf",
    );
    expect(repeatedArchive.toString("binary")).toContain(
      "hormone-harmony/Meal Plan.txt",
    );
    expect(repeatedArchive.toString("binary")).not.toContain(
      "New Edition.pdf",
    );

    const grantRows = await integrationTestContext.queryRows<{
      id: number;
      tokenSha256: string;
    }>({
      sql: `
        select id, token_sha256 as "tokenSha256"
        from app.download_grants
        order by id
      `,
      values: [],
    });
    expect(grantRows.map((grant) => grant.tokenSha256)).toEqual([
      sha256("grant-token-one"),
      sha256("grant-token-two"),
    ]);
    await integrationTestContext.executeSql({
      sql: `
        update app.download_grants
        set status = 'revoked'
        where id = $1
      `,
      values: [grantRows[0]!.id],
    });
    await expect(
      integrationTestContext.executeSql({
        sql: `
          update app.download_grants
          set expires_at = $1
          where id = $2
        `,
        values: [
          new Date("2020-01-01T00:00:00.000Z"),
          grantRows[1]!.id,
        ],
      }),
    ).rejects.toThrow("Issued download grants are immutable.");
    routePlatformContainer.current = {
      ...integrationTestContext.getPlatformContainer(),
      storeDownloadController: createDownloadController(
        new Date("2030-01-01T00:00:00.000Z"),
      ),
    } satisfies PlatformContainer;
    const revokedResponse = await requestRegisteredStoreRoute(
      createDownloadRequest("grant-token-one"),
    );
    const expiredResponse = await requestRegisteredStoreRoute(
      createDownloadRequest("grant-token-two"),
    );
    const unknownResponse = await requestRegisteredStoreRoute(
      createDownloadRequest("unknown-token"),
    );

    expect(revokedResponse.status).toBe(303);
    expect(expiredResponse.status).toBe(303);
    expect(unknownResponse.status).toBe(303);
    const unavailableLocation = `${integrationBasePath}/store/download?unavailable=1`;

    expect(revokedResponse.headers.get("Location")).toBe(
      unavailableLocation,
    );
    expect(expiredResponse.headers.get("Location")).toBe(
      unavailableLocation,
    );
    expect(unknownResponse.headers.get("Location")).toBe(
      unavailableLocation,
    );
  });

  it("deduplicates genuinely concurrent acquisitions with one idempotency key", async () => {
    // arrange
    await seedPublishedProductVersion();
    const sentDeliveries: {
      email: string;
      rawToken: string;
      requestId: number;
    }[] = [];
    const idempotencyKey = "de355729-300a-4d05-b5a6-cc475c9e46df";
    const controller = createAcquisitionController({
      issuedTokens: [
        "concurrent-stable-token",
        "concurrent-stable-token",
      ],
      onDelivery: (delivery) => {
        sentDeliveries.push(delivery);
      },
    });

    // act
    const responses = await Promise.all([
      controller.acquire(createAcquisitionRequest({ idempotencyKey })),
      controller.acquire(createAcquisitionRequest({ idempotencyKey })),
    ]);

    // assert
    expect(responses.map((response) => response.status)).toEqual([
      201,
      201,
    ]);
    expect(sentDeliveries).toHaveLength(1);
    const [counts] = await integrationTestContext.queryRows<{
      acquisitionRequests: number;
      downloadGrants: number;
      requestCount: number;
    }>({
      sql: `
        select
          (select count(*) from app.acquisition_requests)::int
            as "acquisitionRequests",
          (select count(*) from app.download_grants)::int
            as "downloadGrants",
          (select max(request_count) from app.acquisitions)::int
            as "requestCount"
      `,
      values: [],
    });
    expect(counts).toEqual({
      acquisitionRequests: 1,
      downloadGrants: 1,
      requestCount: 1,
    });
  });

  it("rejects a mixed-availability request before persisting any acquisition state", async () => {
    // arrange
    await seedPublishedProductVersion();
    const controller = createAcquisitionController({
      issuedTokens: ["unused-token"],
      onDelivery: vi.fn(),
    });

    // act
    const response = await controller.acquire(
      createAcquisitionRequest({
        idempotencyKey: "fe592267-8f1e-42d2-b40a-52ab0845b748",
        productSlugs: ["hormone-harmony", "removed-guide"],
      }),
    );

    // assert
    expect(response.status).toBe(409);
    const counts = await integrationTestContext.queryRows<{
      recipients: number;
      requests: number;
      acquisitions: number;
      grants: number;
    }>({
      sql: `
        select
          (select count(*) from app.store_recipients)::int as recipients,
          (select count(*) from app.acquisition_requests)::int as requests,
          (select count(*) from app.acquisitions)::int as acquisitions,
          (select count(*) from app.download_grants)::int as grants
      `,
      values: [],
    });

    expect(counts).toEqual([
      {
        acquisitions: 0,
        grants: 0,
        recipients: 0,
        requests: 0,
      },
    ]);
  });

  it("does not resend a provider-accepted delivery whose audit update failed", async () => {
    // arrange
    await seedPublishedProductVersion();
    const sentDeliveries: {
      email: string;
      rawToken: string;
      requestId: number;
    }[] = [];
    const idempotencyKey = "5d129fa9-36e0-4010-8bcb-20b66945f8cf";
    const controller = createAcquisitionController({
      failFirstAcceptedAudit: true,
      issuedTokens: ["stable-grant-token", "stable-grant-token"],
      onDelivery: (delivery) => {
        sentDeliveries.push(delivery);
      },
    });
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    // act
    const acceptedResponse = await controller.acquire(
      createAcquisitionRequest({ idempotencyKey }),
    );
    const replayResponse = await controller.acquire(
      createAcquisitionRequest({ idempotencyKey }),
    );

    // assert
    expect(acceptedResponse.status).toBe(503);
    expect(replayResponse.status).toBe(503);
    await expect(replayResponse.json()).resolves.toMatchObject({
      error: { code: "delivery_retryable" },
      success: false,
    });
    expect(sentDeliveries).toEqual([
      expect.objectContaining({ rawToken: "stable-grant-token" }),
    ]);
    const deliveryAttempts = await integrationTestContext.queryRows<{
      providerMessageId: string | null;
      status: string;
    }>({
      sql: `
        select
          provider_message_id as "providerMessageId",
          status
        from app.delivery_attempts
        order by id
      `,
      values: [],
    });
    expect(deliveryAttempts).toEqual([
      {
        providerMessageId: null,
        status: "pending",
      },
    ]);
    consoleError.mockRestore();
  });

  it("does not retry delivery after a pending grant has expired", async () => {
    // arrange
    await seedPublishedProductVersion();
    const idempotencyKey = "70019ed0-f75d-4fc8-9962-95f2be04b10e";
    let currentNow = fixedNow;
    const controller = createAcquisitionController({
      deliveryFailure: new Error("provider unavailable"),
      issuedTokens: ["expired-pending-grant-token"],
      now: () => currentNow,
      onDelivery: vi.fn(),
    });
    const initialResponse = await controller.acquire(
      createAcquisitionRequest({ idempotencyKey }),
    );
    currentNow = new Date("2026-08-06T12:00:00.001Z");

    // act
    const replayResponse = await controller.acquire(
      createAcquisitionRequest({ idempotencyKey }),
    );

    // assert
    expect(initialResponse.status).toBe(503);
    await expect(initialResponse.json()).resolves.toMatchObject({
      error: { code: "delivery_retryable" },
      success: false,
    });
    expect(replayResponse.status).toBe(503);
    await expect(replayResponse.json()).resolves.toMatchObject({
      error: { code: "delivery_unavailable" },
      success: false,
    });
    const [attemptCount] = await integrationTestContext.queryRows<{
      count: number;
    }>({
      sql: `
        select count(*)::int as count
        from app.delivery_attempts attempt
        join app.acquisition_requests request
          on request.id = attempt.request_id
        where request.idempotency_key = $1
      `,
      values: [idempotencyKey],
    });
    expect(attemptCount).toEqual({ count: 1 });
  });

  it("keeps accepted delivery evidence terminal when a stale rejection arrives", async () => {
    // arrange
    await seedPublishedProductVersion();
    const controller = createAcquisitionController({
      issuedTokens: ["terminal-delivery-token"],
      onDelivery: vi.fn(),
    });
    const response = await controller.acquire(
      createAcquisitionRequest({
        idempotencyKey: "2948fcef-6767-42a1-bd58-602f6f7adfc8",
      }),
    );
    const [request] = await integrationTestContext.queryRows<{
      deliveryAttemptId: number;
      requestId: number;
    }>({
      sql: `
        select
          request.id as "requestId",
          attempt.id as "deliveryAttemptId"
        from app.acquisition_requests request
        join app.delivery_attempts attempt on attempt.request_id = request.id
      `,
      values: [],
    });
    const repository = new PostgresStoreAcquisitionRepository(
      integrationTestContext.getPlatformContainer().databaseClient,
    );

    // act
    await repository.recordDeliveryRejected({
      deliveryAttemptId: request!.deliveryAttemptId,
      provider: "integration-email",
      requestId: request!.requestId,
    });

    // assert
    expect(response.status).toBe(201);
    const [deliveryState] = await integrationTestContext.queryRows<{
      attemptStatus: string;
      grantStatus: string;
      requestStatus: string;
    }>({
      sql: `
        select
          request.delivery_status as "requestStatus",
          attempt.status as "attemptStatus",
          download_grant.status as "grantStatus"
        from app.acquisition_requests request
        join app.delivery_attempts attempt on attempt.request_id = request.id
        join app.download_grants download_grant
          on download_grant.request_id = request.id
      `,
      values: [],
    });
    expect(deliveryState).toEqual({
      attemptStatus: "accepted",
      grantStatus: "active",
      requestStatus: "accepted",
    });
  });

  it("revokes the undelivered grant after a definitive provider rejection", async () => {
    // arrange
    await seedPublishedProductVersion();
    const controller = createAcquisitionController({
      deliveryFailure: new StoreDeliveryRejectedError(),
      issuedTokens: ["rejected-delivery-token"],
      onDelivery: vi.fn(),
    });

    // act
    const response = await controller.acquire(
      createAcquisitionRequest({
        idempotencyKey: "9b9d87c6-b6b4-483d-a0cf-f734d9a65f00",
      }),
    );

    // assert
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "delivery_unavailable" },
      success: false,
    });
    const [deliveryState] = await integrationTestContext.queryRows<{
      attemptStatus: string;
      grantStatus: string;
      requestStatus: string;
    }>({
      sql: `
        select
          attempt.status as "attemptStatus",
          download_grant.status as "grantStatus",
          request.delivery_status as "requestStatus"
        from app.acquisition_requests request
        join app.delivery_attempts attempt on attempt.request_id = request.id
        join app.download_grants download_grant
          on download_grant.request_id = request.id
      `,
      values: [],
    });
    expect(deliveryState).toEqual({
      attemptStatus: "rejected",
      grantStatus: "revoked",
      requestStatus: "rejected",
    });
  });

  it("rejects a catalog snapshot that becomes archived before the persistence transaction", async () => {
    // arrange
    await seedPublishedProductVersion();
    const controller = createAcquisitionController({
      archiveProductAfterCatalogLoad: true,
      issuedTokens: ["unused-archived-product-token"],
      onDelivery: vi.fn(),
    });

    // act
    const response = await controller.acquire(
      createAcquisitionRequest({
      idempotencyKey: "4b37e62d-8d77-4578-9659-38156b7966ed",
      }),
    );

    // assert
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        availableProductSlugs: [],
        code: "unavailable_products",
      },
      success: false,
    });
    const persistedRequests = await integrationTestContext.queryRows<{
      count: number;
    }>({
      sql: `
        select count(*)::int as count
        from app.acquisition_requests
      `,
      values: [],
    });
    expect(persistedRequests).toEqual([{ count: 0 }]);
  });

  it("declines a repeat request inside the delivery cooldown without persisting anything", async () => {
    // arrange
    await seedPublishedProductVersion();
    const sentDeliveries: {
      email: string;
      rawToken: string;
      requestId: number;
    }[] = [];
    const controller = createAcquisitionController({
      issuedTokens: ["cooldown-first-token", "cooldown-second-token"],
      onDelivery: (delivery) => {
        sentDeliveries.push(delivery);
      },
    });
    const firstResponse = await controller.acquire(
      createAcquisitionRequest({
        idempotencyKey: "1f0c6a2e-5f2b-4f0a-9d2e-0b6a1c3d4e5f",
      }),
    );

    // act
    const cooldownResponse = await controller.acquire(
      createAcquisitionRequest({
        idempotencyKey: "2a1b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
      }),
    );

    // assert
    expect(firstResponse.status).toBe(201);
    expect(cooldownResponse.status).toBe(429);
    await expect(cooldownResponse.json()).resolves.toEqual({
      error: {
        code: "rate_limited_cooldown",
        message: "Unable to deliver store resources.",
      },
      success: false,
    });
    expect(sentDeliveries).toHaveLength(1);
    const [counts] = await integrationTestContext.queryRows<{
      acquisitions: number;
      attempts: number;
      grantItems: number;
      grants: number;
      recipients: number;
      requestCount: number;
      requests: number;
    }>({
      sql: `
        select
          (select count(*) from app.store_recipients)::int as "recipients",
          (select count(*) from app.acquisition_requests)::int as "requests",
          (select count(*) from app.acquisitions)::int as "acquisitions",
          (select max(request_count) from app.acquisitions)::int
            as "requestCount",
          (select count(*) from app.download_grants)::int as "grants",
          (select count(*) from app.download_grant_items)::int
            as "grantItems",
          (select count(*) from app.delivery_attempts)::int as "attempts"
      `,
      values: [],
    });
    expect(counts).toEqual({
      acquisitions: 1,
      attempts: 1,
      grantItems: 1,
      grants: 1,
      recipients: 1,
      requestCount: 1,
      requests: 1,
    });
  });

  it("frees the cooldown exactly one minute after the previous delivery", async () => {
    // arrange
    await seedPublishedProductVersion();
    const sentDeliveries: {
      email: string;
      rawToken: string;
      requestId: number;
    }[] = [];
    let acquisitionNow = fixedNow;
    const controller = createAcquisitionController({
      issuedTokens: [
        "boundary-token-1",
        "boundary-token-2",
        "boundary-token-3",
      ],
      now: () => acquisitionNow,
      onDelivery: (delivery) => {
        sentDeliveries.push(delivery);
      },
    });
    const firstResponse = await controller.acquire(
      createAcquisitionRequest({
        idempotencyKey: "b0000000-0000-4000-8000-000000000001",
      }),
    );

    // act
    acquisitionNow = new Date(fixedNow.getTime() + 59_999);
    const justInsideResponse = await controller.acquire(
      createAcquisitionRequest({
        idempotencyKey: "b0000000-0000-4000-8000-000000000002",
      }),
    );
    acquisitionNow = new Date(fixedNow.getTime() + 60_000);
    const atBoundaryResponse = await controller.acquire(
      createAcquisitionRequest({
        idempotencyKey: "b0000000-0000-4000-8000-000000000003",
      }),
    );

    // assert
    expect(firstResponse.status).toBe(201);
    expect(justInsideResponse.status).toBe(429);
    expect(atBoundaryResponse.status).toBe(201);
    expect(sentDeliveries).toHaveLength(2);
  });

  it("declines an exhausted rolling allowance with its own outcome", async () => {
    // arrange
    await seedPublishedProductVersion();
    const sentDeliveries: {
      email: string;
      rawToken: string;
      requestId: number;
    }[] = [];
    let acquisitionNow = fixedNow;
    const allowance = 10;
    const idempotencyKeys = Array.from(
      { length: allowance + 1 },
      (_unused, index) =>
        `a0000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    );
    const controller = createAcquisitionController({
      issuedTokens: idempotencyKeys.map(
        (_unused, index) => `allowance-token-${index + 1}`,
      ),
      now: () => acquisitionNow,
      onDelivery: (delivery) => {
        sentDeliveries.push(delivery);
      },
    });
    const acceptedStatuses: number[] = [];

    for (const [index, idempotencyKey] of idempotencyKeys
      .slice(0, allowance)
      .entries()) {
      // Two minutes apart clears the cooldown while staying inside 24 hours.
      acquisitionNow = new Date(fixedNow.getTime() + index * 2 * 60 * 1000);
      const response = await controller.acquire(
        createAcquisitionRequest({ idempotencyKey }),
      );
      acceptedStatuses.push(response.status);
    }

    // act
    acquisitionNow = new Date(
      fixedNow.getTime() + (allowance + 1) * 2 * 60 * 1000,
    );
    const exhaustedResponse = await controller.acquire(
      createAcquisitionRequest({
        idempotencyKey: idempotencyKeys[allowance]!,
      }),
    );

    // assert
    expect(acceptedStatuses).toEqual(Array(allowance).fill(201));
    expect(exhaustedResponse.status).toBe(429);
    await expect(exhaustedResponse.json()).resolves.toEqual({
      error: {
        code: "rate_limited_daily",
        message: "Unable to deliver store resources.",
      },
      success: false,
    });
    expect(sentDeliveries).toHaveLength(allowance);
    const [counts] = await integrationTestContext.queryRows<{
      grants: number;
      requests: number;
    }>({
      sql: `
        select
          (select count(*) from app.acquisition_requests)::int as "requests",
          (select count(*) from app.download_grants)::int as "grants"
      `,
      values: [],
    });
    expect(counts).toEqual({ grants: allowance, requests: allowance });
  });

  it("shares one allowance across sub-addressed variants of an inbox", async () => {
    // arrange
    await seedPublishedProductVersion();
    const sentDeliveries: {
      email: string;
      rawToken: string;
      requestId: number;
    }[] = [];
    const controller = createAcquisitionController({
      issuedTokens: ["tagged-token-1", "tagged-token-2"],
      onDelivery: (delivery) => {
        sentDeliveries.push(delivery);
      },
    });
    const firstResponse = await controller.acquire(
      createAcquisitionRequest({
        email: "woman@example.com",
        idempotencyKey: "c0000000-0000-4000-8000-000000000001",
      }),
    );

    // act
    const taggedResponse = await controller.acquire(
      createAcquisitionRequest({
        email: "woman+guides@example.com",
        idempotencyKey: "c0000000-0000-4000-8000-000000000002",
      }),
    );

    // assert
    expect(firstResponse.status).toBe(201);
    expect(taggedResponse.status).toBe(429);
    await expect(taggedResponse.json()).resolves.toMatchObject({
      error: { code: "rate_limited_cooldown" },
      success: false,
    });
    expect(sentDeliveries).toHaveLength(1);
  });

  it.each([
    ["a definitive provider rejection", new StoreDeliveryRejectedError()],
    ["an ambiguous provider outcome", new Error("provider timed out")],
  ])("releases the allowance after %s", async (_label, deliveryFailure) => {
    // arrange
    await seedPublishedProductVersion();
    const failingController = createAcquisitionController({
      deliveryFailure,
      issuedTokens: ["released-first-token"],
      onDelivery: vi.fn(),
    });
    const failedResponse = await failingController.acquire(
      createAcquisitionRequest({
        idempotencyKey: "3b2c4d5e-6f70-4b81-9c2d-3e4f5a6b7c8d",
      }),
    );
    const sentDeliveries: {
      email: string;
      rawToken: string;
      requestId: number;
    }[] = [];
    const controller = createAcquisitionController({
      issuedTokens: ["released-second-token"],
      onDelivery: (delivery) => {
        sentDeliveries.push(delivery);
      },
    });

    // act — the same instant, so only a released slot can allow this through
    const response = await controller.acquire(
      createAcquisitionRequest({
        idempotencyKey: "4c3d5e6f-7081-4c92-8d3e-4f5a6b7c8d9e",
      }),
    );

    // assert
    expect(failedResponse.status).toBe(503);
    expect(response.status).toBe(201);
    expect(sentDeliveries).toHaveLength(1);
  });

  it("delivers once when two requests for one email arrive together", async () => {
    // arrange
    await seedPublishedProductVersion();
    const sentDeliveries: {
      email: string;
      rawToken: string;
      requestId: number;
    }[] = [];
    const controller = createAcquisitionController({
      issuedTokens: ["simultaneous-token-1", "simultaneous-token-2"],
      onDelivery: (delivery) => {
        sentDeliveries.push(delivery);
      },
    });

    // act
    const responses = await Promise.all([
      controller.acquire(
        createAcquisitionRequest({
          idempotencyKey: "7f608192-a3b4-4fc5-9061-7c8d9e0f1021",
        }),
      ),
      controller.acquire(
        createAcquisitionRequest({
          idempotencyKey: "80719203-b4c5-40d6-8172-8d9e0f102132",
        }),
      ),
    ]);

    // assert
    expect(
      responses.map((response) => response.status).sort(),
    ).toEqual([201, 429]);
    expect(sentDeliveries).toHaveLength(1);
    const [counts] = await integrationTestContext.queryRows<{
      grants: number;
      requests: number;
    }>({
      sql: `
        select
          (select count(*) from app.acquisition_requests)::int as "requests",
          (select count(*) from app.download_grants)::int as "grants"
      `,
      values: [],
    });
    expect(counts).toEqual({ grants: 1, requests: 1 });
  });

  it("rejects an unverified submission before evaluating limits or persisting", async () => {
    // arrange
    await seedPublishedProductVersion();
    const controller = createAcquisitionController({
      issuedTokens: ["unverified-token"],
      onDelivery: vi.fn(),
    });

    // act
    const response = await controller.acquire(
      createAcquisitionRequest({
        idempotencyKey: "91829304-c5d6-41e7-9283-9e0f10213243",
        turnstileToken: "not-the-expected-token",
      }),
    );

    // assert
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "bot_verification_failed" },
      success: false,
    });
    const [counts] = await integrationTestContext.queryRows<{
      recipients: number;
      requests: number;
    }>({
      sql: `
        select
          (select count(*) from app.acquisition_requests)::int as "requests",
          (select count(*) from app.store_recipients)::int as "recipients"
      `,
      values: [],
    });
    expect(counts).toEqual({ recipients: 0, requests: 0 });
  });
});

function createAcquisitionController(options: {
  archiveProductAfterCatalogLoad?: boolean;
  deliveryFailure?: Error;
  failFirstAcceptedAudit?: boolean;
  issuedTokens: string[];
  now?: () => Date;
  onDelivery: (delivery: {
    email: string;
    rawToken: string;
    requestId: number;
  }) => void;
}) {
  const databaseClient =
    integrationTestContext.getPlatformContainer().databaseClient;
  const catalogRepository = new PostgresStoreCatalogRepository(databaseClient);
  let shouldArchiveProductAfterCatalogLoad =
    options.archiveProductAfterCatalogLoad ?? false;
  const acquisitionCatalogRepository: StoreCatalogRepository = {
    getPublishedCatalog: async () => {
      const catalog = await catalogRepository.getPublishedCatalog();

      if (shouldArchiveProductAfterCatalogLoad) {
        shouldArchiveProductAfterCatalogLoad = false;
        await integrationTestContext.executeSql({
          sql: `
            update app.products
            set lifecycle_status = 'archived'
            where slug = 'hormone-harmony'
          `,
          values: [],
        });
      }

      return catalog;
    },
    getPublishedCoverByAssetKey: (assetKey) =>
      catalogRepository.getPublishedCoverByAssetKey(assetKey),
    getPublishedProductBySlug: (slug) =>
      catalogRepository.getPublishedProductBySlug(slug),
  };
  const postgresAcquisitionRepository =
    new PostgresStoreAcquisitionRepository(databaseClient);
  let shouldFailAcceptedAudit = options.failFirstAcceptedAudit ?? false;
  const acquisitionRepository: StoreAcquisitionRepository = {
    prepareAcquisition: (command) =>
      postgresAcquisitionRepository.prepareAcquisition(command),
    recordDeliveryAccepted: async (command) => {
      if (shouldFailAcceptedAudit) {
        shouldFailAcceptedAudit = false;
        throw new Error("simulated accepted-delivery audit failure");
      }

      await postgresAcquisitionRepository.recordDeliveryAccepted(command);
    },
    recordDeliveryRejected: (command) =>
      postgresAcquisitionRepository.recordDeliveryRejected(command),
    recordDeliveryRetryable: (command) =>
      postgresAcquisitionRepository.recordDeliveryRetryable(command),
    resolveIdempotency: (command) =>
      postgresAcquisitionRepository.resolveIdempotency(command),
  };
  let nextTokenIndex = 0;
  const deliveriesByIdempotencyKey = new Map<
    string,
    { provider: string; providerMessageId: string }
  >();
  const deliveryService: StoreDeliveryService = {
    createProviderIdempotencyKey: (applicationIdempotencyKey) =>
      `integration-store-acquisition-${applicationIdempotencyKey}`,
    provider: "integration-email",
    async deliver(command) {
      const priorDelivery = deliveriesByIdempotencyKey.get(
        command.idempotencyKey,
      );

      if (priorDelivery) {
        return priorDelivery;
      }

      if (options.deliveryFailure) {
        throw options.deliveryFailure;
      }

      options.onDelivery({
        email: command.email,
        rawToken: command.rawToken,
        requestId: command.requestId,
      });

      const delivery = {
        provider: "integration-email",
        providerMessageId: `message-${command.requestId}`,
      };

      deliveriesByIdempotencyKey.set(command.idempotencyKey, delivery);

      return delivery;
    },
  };
  const service = new StoreAcquisitionService({
    acquisitionRepository,
    catalogRepository: acquisitionCatalogRepository,
    clock: { now: options.now ?? (() => fixedNow) },
    consentVersions: {
      marketingConsentVersion: STORE_MARKETING_CONSENT_VERSION,
      privacyPolicyVersion: PRIVACY_POLICY_VERSION,
      termsVersion: WEBSITE_AND_STORE_TERMS_DOCUMENT.version,
    },
    deliveryService,
    payloadDigestGenerator: new PayloadSha256Digest(),
    tokenGenerator: {
      create() {
        const rawToken = options.issuedTokens[nextTokenIndex++]!;

        return { rawToken, sha256: sha256(rawToken) };
      },
    },
  });

  return new StoreAcquisitionController(
    service,
    new StaticTokenBotVerifier({
      validToken: TURNSTILE_TEST_RESPONSE_TOKEN,
    }),
  );
}

function createAcquisitionRequest(options: {
  email?: string;
  idempotencyKey: string;
  productSlugs?: readonly string[];
  turnstileToken?: string;
}): Request {
  const formData = new FormData();
  formData.set(
    "cf-turnstile-response",
    options.turnstileToken ?? TURNSTILE_TEST_RESPONSE_TOKEN,
  );
  formData.set("email", options.email ?? "  WOMAN@Example.com ");
  formData.set("idempotencyKey", options.idempotencyKey);
  formData.set("marketingConsent", "true");
  formData.set(
    "productSlugs",
    JSON.stringify(options.productSlugs ?? ["hormone-harmony"]),
  );
  formData.set("termsAccepted", "true");

  return new Request(
    `http://localhost${integrationBasePath}/api/store/acquisitions`,
    {
      body: formData,
      method: "POST",
    },
  );
}

function createDownloadRequest(token: string): Request {
  const formData = new FormData();
  formData.set("token", token);

  return new Request(
    `http://localhost${integrationBasePath}/api/store/downloads`,
    {
      body: formData,
      method: "POST",
    },
  );
}

function createDownloadController(now: Date): StoreDownloadController {
  const assetStore = new FilesystemProductAssetStore(
    integrationTestContext.getStoreAssetRoot(),
  );

  return new StoreDownloadController(
    new DownloadGrantService({
      clock: { now: () => now },
      repository: new PostgresDownloadGrantRepository(
        integrationTestContext.getPlatformContainer().databaseClient,
      ),
      tokenHasher: new DownloadTokenSha256(),
    }),
    assetStore,
    {
      appBasePath: integrationBasePath,
      zipDeliveryStream: new ZipDeliveryStream(assetStore),
    },
  );
}

function createStoreRouteHandler() {
  const routeModules = new Map([
    [
      "./features/store/api/acquisitions.ts",
      acquisitionsRoute,
    ],
    ["./features/store/api/catalog.ts", catalogRoute],
    ["./features/store/api/covers.ts", coverRoute],
    ["./features/store/api/downloads.ts", downloadsRoute],
  ]);
  const registeredRoutes = flattenRouteConfig(
    appRoutes as RouteConfigEntry[],
  );
  const storeRoutes = [...routeModules].map(([file, routeModule]) => {
    const registeredRoute = registeredRoutes.find(
      (candidate) => candidate.file === file,
    );

    if (!registeredRoute?.path) {
      throw new Error(`Store route is not registered: ${file}`);
    }

    return {
      action: routeModule.action,
      id: file,
      loader: routeModule.loader,
      path: registeredRoute.path,
    };
  });

  return createStaticHandler(storeRoutes, {
    basename: integrationBasePath,
  });
}

function flattenRouteConfig(
  routes: readonly RouteConfigEntry[],
): RouteConfigEntry[] {
  return routes.flatMap((route) => [
    route,
    ...flattenRouteConfig(route.children ?? []),
  ]);
}

async function requestRegisteredStoreRoute(
  request: Request,
): Promise<Response> {
  const response = await storeRouteHandler.queryRoute(request);

  if (!(response instanceof Response)) {
    throw new Error("Store resource route did not return a response.");
  }

  return response;
}

async function seedPublishedProductVersion() {
  const assetRoot = integrationTestContext.getStoreAssetRoot();
  const coverAssetKey = "covers/hormone-harmony-v1.webp";
  const firstAssetKey = "products/hormone-harmony-v1.pdf";
  const secondAssetKey = "products/meal-plan-v1.txt";
  const cover = Buffer.from("cover-version-one");
  const firstAsset = Buffer.from("guide-version-one");
  const secondAsset = Buffer.from("meal-plan-version-one");

  await mkdir(join(assetRoot, "covers"), { recursive: true });
  await mkdir(join(assetRoot, "products"), { recursive: true });
  await Promise.all([
    writeFile(join(assetRoot, coverAssetKey), cover),
    writeFile(join(assetRoot, firstAssetKey), firstAsset),
    writeFile(join(assetRoot, secondAssetKey), secondAsset),
  ]);
  await integrationTestContext.executeSql({
    sql: `
      insert into app.products (slug, lifecycle_status, display_order)
      values ('hormone-harmony', 'published', 1)
    `,
    values: [],
  });
  await integrationTestContext.executeSql({
    sql: `
      insert into app.product_versions (
        product_id,
        sequence,
        title,
        creator_name,
        card_summary,
        detail_description,
        included_items,
        cover_asset_key,
        cover_alt,
        cover_mime_type,
        cover_size_bytes,
        cover_sha256
      )
      select
        id,
        1,
        'Hormone Harmony',
        'Eli',
        'A practical cycle-aware guide.',
        'Phase-by-phase nutrition guidance.',
        '["Phase-by-phase guidance", "A meal plan"]'::jsonb,
        $1,
        'Hormone Harmony guide cover',
        'image/webp',
        $2,
        $3
      from app.products
      where slug = 'hormone-harmony'
    `,
    values: [coverAssetKey, cover.byteLength, sha256(cover)],
  });
  await integrationTestContext.executeSql({
    sql: `
      insert into app.product_version_assets (
        product_version_id,
        asset_key,
        customer_filename,
        mime_type,
        size_bytes,
        sha256
      )
      select
        version.id,
        asset.asset_key,
        asset.customer_filename,
        asset.mime_type,
        asset.size_bytes,
        asset.sha256
      from app.product_versions version
      cross join (
        values
          ($1::text, 'Hormone Harmony.pdf', 'application/pdf', $2::integer, $3::text),
          ($4::text, 'Meal Plan.txt', 'text/plain', $5::integer, $6::text)
      ) asset (
        asset_key,
        customer_filename,
        mime_type,
        size_bytes,
        sha256
      )
      where version.sequence = 1
    `,
    values: [
      firstAssetKey,
      firstAsset.byteLength,
      sha256(firstAsset),
      secondAssetKey,
      secondAsset.byteLength,
      sha256(secondAsset),
    ],
  });
  await integrationTestContext.executeSql({
    sql: `
      insert into app.product_version_type_assignments (
        product_version_id,
        product_type_id
      )
      select version.id, type.id
      from app.product_versions version
      cross join app.product_types type
      where version.sequence = 1 and type.slug = 'e-books'
    `,
    values: [],
  });
  await integrationTestContext.executeSql({
    sql: `
      insert into app.product_version_goal_assignments (
        product_version_id,
        product_goal_id
      )
      select version.id, goal.id
      from app.product_versions version
      cross join app.product_goals goal
      where version.sequence = 1 and goal.slug = 'wellness'
    `,
    values: [],
  });
  await integrationTestContext.executeSql({
    sql: `
      update app.product_versions
      set published_at = $1
      where sequence = 1
    `,
    values: [new Date("2026-07-30T10:00:00.000Z")],
  });

  return { coverAssetKey };
}

async function seedNextPublishedVersion() {
  const assetRoot = integrationTestContext.getStoreAssetRoot();
  const coverAssetKey = "covers/hormone-harmony-v2.webp";
  const assetKey = "products/hormone-harmony-v2.pdf";
  const cover = Buffer.from("cover-version-two");
  const asset = Buffer.from("guide-version-two");

  await Promise.all([
    writeFile(join(assetRoot, coverAssetKey), cover),
    writeFile(join(assetRoot, assetKey), asset),
  ]);
  await integrationTestContext.executeSql({
    sql: `
      insert into app.product_versions (
        product_id,
        sequence,
        title,
        creator_name,
        card_summary,
        detail_description,
        included_items,
        cover_asset_key,
        cover_alt,
        cover_mime_type,
        cover_size_bytes,
        cover_sha256
      )
      select
        id,
        2,
        'Hormone Harmony — New Edition',
        'Eli',
        'A new edition.',
        'New edition guidance.',
        '["New guidance"]'::jsonb,
        $1,
        'New edition cover',
        'image/webp',
        $2,
        $3
      from app.products
      where slug = 'hormone-harmony'
    `,
    values: [coverAssetKey, cover.byteLength, sha256(cover)],
  });
  await integrationTestContext.executeSql({
    sql: `
      insert into app.product_version_assets (
        product_version_id,
        asset_key,
        customer_filename,
        mime_type,
        size_bytes,
        sha256
      )
      select id, $1, 'New Edition.pdf', 'application/pdf', $2, $3
      from app.product_versions
      where sequence = 2
    `,
    values: [assetKey, asset.byteLength, sha256(asset)],
  });
  await integrationTestContext.executeSql({
    sql: `
      update app.product_versions
      set published_at = $1
      where sequence = 2
    `,
    values: [new Date("2026-07-30T11:00:00.000Z")],
  });
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}
