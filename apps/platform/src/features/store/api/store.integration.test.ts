import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  PRIVACY_POLICY_VERSION,
  STORE_MARKETING_CONSENT_VERSION,
  WEBSITE_AND_STORE_TERMS_DOCUMENT,
} from "@eli-coach-platform/content";
import {
  STORE_ACQUISITION_TURNSTILE_ACTION,
  WAITLIST_TURNSTILE_ACTION,
} from "@eli-coach-platform/infrastructure/bot-detection";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  ApiIntegrationTestSuite,
  type SentEmail,
} from "~integration-test-config/api-integration-test-suite";
import {
  resendFailsWithoutVerdict,
  resendRejects,
} from "~integration-test-config/wire-mock/expectations/resend-emails";
import { turnstileTokenForAction } from "~integration-test-config/wire-mock/expectations/turnstile-siteverify";

const suite = new ApiIntegrationTestSuite();
const publishedAt = new Date("2026-07-30T10:00:00.000Z");
const republishedAt = new Date("2026-07-30T11:00:00.000Z");
const storeSubmissionToken = turnstileTokenForAction(
  STORE_ACQUISITION_TURNSTILE_ACTION,
);
const deliveryAllowance = 10;
/**
 * The application runs in its own process and reads the wall clock, so a case
 * that needs time to have passed ages the rows the application measures
 * against instead — the delivery windows are counted from the timestamp on a
 * delivery attempt, and a grant expires at the timestamp it carries.
 *
 * The intervals are deliberately coarse: real time keeps moving between the
 * arrangement and the request, so a margin is what stops the arrangement from
 * meaning something else by the time it is read. The exact edges — a delivery
 * exactly one minute old, an attempt exactly at the window's start — belong to
 * the unit tests over `StoreAcquisitionService` and the repository, which can
 * name an instant and hold it still.
 */
const PAST_THE_COOLDOWN = "70 seconds";
const INSIDE_THE_COOLDOWN = "30 seconds";
const PAST_THE_COOLDOWN_INSIDE_A_DAY = "2 minutes";

describe.sequential("Store integration", () => {
  beforeAll(async () => {
    await suite.start();
  });

  afterEach(async () => {
    await suite.reset();
  });

  afterAll(async () => {
    await suite.stop();
  });

  it("serves the live catalog and only verified published cover bytes", async () => {
    // arrange
    const fixture = await seedPublishedProductVersion();

    // act
    const catalogResponse = await suite.request(
      new Request(suite.url("/api/store/catalog")),
    );
    const catalog = (await catalogResponse.json()) as {
      products: { cover: { url: string } }[];
    };
    const coverResponse = await suite.request(
      new Request(`http://localhost${catalog.products[0]!.cover.url}`),
    );
    await seedNextPublishedVersion();
    const previousVersionCoverResponse = await suite.request(
      new Request(`http://localhost${catalog.products[0]!.cover.url}`),
    );
    const rejectedCatalogMutation = await suite.request(
      new Request(suite.url("/api/store/catalog"), { method: "POST" }),
    );

    // assert
    expect(catalogResponse.status).toBe(200);
    expect(catalog).toMatchObject({
      products: [
        {
          cover: {
            alt: "Hormone Harmony guide cover",
            url: suite.path(
              `/api/store/covers/${encodeURIComponent(fixture.coverAssetKey)}`,
            ),
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
      join(suite.assetRoot(), fixture.coverAssetKey),
      "tampered-cover",
    );

    // act
    const tamperedCoverResponse = await suite.request(
      new Request(
        suite.url(
          `/api/store/covers/${encodeURIComponent(fixture.coverAssetKey)}`,
        ),
      ),
    );

    // assert
    expect(tamperedCoverResponse.status).toBe(503);
  });

  it("persists consent, a pinned grant, and one delivery for an acquisition", async () => {
    // arrange
    await seedPublishedProductVersion();

    // act
    const response = await requestAcquisition({
      idempotencyKey: "d744ad8e-632c-4dfe-ac70-033bd3221522",
    });

    // assert
    expect(response.status).toBe(201);
    const [delivered] = await suite.sentEmails();
    expect(delivered).toMatchObject({
      subject: "Your guide is ready",
      to: "woman@example.com",
    });
    const evidence = await suite.postgres.queryRows<{
      normalizedEmail: string;
      requestCount: number;
      termsVersion: string;
      privacyPolicyVersion: string;
      marketingConsentVersion: string;
      marketingConsent: boolean;
      marketingConsentedAt: Date | null;
      grantItemRows: number;
      acceptedAttempts: number;
    }>({
      sql: `
        select
          recipient.normalized_email as "normalizedEmail",
          acquisition.request_count as "requestCount",
          request.terms_version as "termsVersion",
          request.privacy_policy_version as "privacyPolicyVersion",
          request.marketing_consent_version as "marketingConsentVersion",
          request.marketing_consent as "marketingConsent",
          request.marketing_consented_at as "marketingConsentedAt",
          count(grant_item.grant_id)::int as "grantItemRows",
          count(delivery.id) filter (
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
        group by recipient.normalized_email, acquisition.request_count, request.id
      `,
      values: [],
    });

    expect(evidence).toEqual([
      expect.objectContaining({
        acceptedAttempts: 1,
        grantItemRows: 1,
        marketingConsent: true,
        marketingConsentVersion: STORE_MARKETING_CONSENT_VERSION,
        normalizedEmail: "woman@example.com",
        privacyPolicyVersion: PRIVACY_POLICY_VERSION,
        requestCount: 1,
        termsVersion: WEBSITE_AND_STORE_TERMS_DOCUMENT.version,
      }),
    ]);
    expect(evidence[0]?.marketingConsentedAt).toBeInstanceOf(Date);
    const [grant] = await suite.postgres.queryRows<{ tokenSha256: string }>({
      sql: `select token_sha256 as "tokenSha256" from app.download_grants`,
      values: [],
    });
    expect(grant!.tokenSha256).toBe(sha256(downloadTokenFrom(delivered!)));
  });

  it("delivers nothing more for a technical retry of the same request", async () => {
    // arrange
    await seedPublishedProductVersion();
    const idempotencyKey = "d744ad8e-632c-4dfe-ac70-033bd3221522";
    const firstResponse = await requestAcquisition({ idempotencyKey });
    await suite.postgres.executeSql({
      sql: `
        update app.products
        set lifecycle_status = 'archived'
        where slug = 'hormone-harmony'
      `,
      values: [],
    });

    // act
    const retryResponse = await requestAcquisition({ idempotencyKey });

    // assert
    expect(firstResponse.status).toBe(201);
    expect(retryResponse.status).toBe(201);
    await expect(suite.sentEmails()).resolves.toHaveLength(1);
    const [counts] = await suite.postgres.queryRows<{
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

  it("delivers again for a deliberate repeat request", async () => {
    // arrange
    await seedPublishedProductVersion();
    await requestAcquisition({
      idempotencyKey: "d744ad8e-632c-4dfe-ac70-033bd3221522",
    });
    await ageDeliveryHistory(PAST_THE_COOLDOWN);

    // act
    const repeatResponse = await requestAcquisition({
      idempotencyKey: "2e15d596-66b4-4892-8fa2-6f0f25896605",
    });

    // assert
    expect(repeatResponse.status).toBe(201);
    const [first, repeat] = await suite.sentEmails();
    expect(downloadTokenFrom(repeat!)).not.toBe(downloadTokenFrom(first!));
    const [{ requestCount }] = await suite.postgres.queryRows<{
      requestCount: number;
    }>({
      sql: `select max(request_count)::int as "requestCount" from app.acquisitions`,
      values: [],
    });
    expect(requestCount).toBe(2);
  });

  it("pins a download to the product version that was live when it was requested", async () => {
    // arrange
    await seedPublishedProductVersion();
    await requestAcquisition({
      idempotencyKey: "5c4d6e7f-8091-4da2-9e4f-5a6b7c8d9e0f",
    });
    const [delivered] = await suite.sentEmails();
    await seedNextPublishedVersion();

    // act
    const downloadResponse = await requestDownload(downloadTokenFrom(delivered!));
    const archive = Buffer.from(await downloadResponse.arrayBuffer());

    // assert
    expect(downloadResponse.status).toBe(200);
    expect(downloadResponse.headers.get("Content-Type")).toBe("application/zip");
    expect(archive.subarray(0, 2).toString()).toBe("PK");
    expect(archive.toString("binary")).toContain(
      "hormone-harmony/Hormone Harmony.pdf",
    );
    expect(archive.toString("binary")).toContain("hormone-harmony/Meal Plan.txt");
    expect(archive.toString("binary")).not.toContain("New Edition.pdf");
  });

  it("serves the same archive when a grant is downloaded again", async () => {
    // arrange
    await seedPublishedProductVersion();
    await requestAcquisition({
      idempotencyKey: "6d5e7f80-91a2-4eb3-8f50-6b7c8d9e0f10",
    });
    const [delivered] = await suite.sentEmails();
    const downloadToken = downloadTokenFrom(delivered!);
    const firstDownload = await requestDownload(downloadToken);

    // act
    const repeatedDownload = await requestDownload(downloadToken);

    // assert
    expect(firstDownload.status).toBe(200);
    expect(repeatedDownload.status).toBe(200);
    const repeatedArchive = Buffer.from(await repeatedDownload.arrayBuffer());
    expect(repeatedArchive.subarray(0, 2).toString()).toBe("PK");
    expect(repeatedArchive.toString("binary")).toContain(
      "hormone-harmony/Hormone Harmony.pdf",
    );
  });

  it("sends a revoked grant to the unavailable page", async () => {
    // arrange
    await seedPublishedProductVersion();
    await requestAcquisition({
      idempotencyKey: "7e6f8091-a2b3-4fc4-9061-7c8d9e0f1021",
    });
    const [delivered] = await suite.sentEmails();
    await suite.postgres.executeSql({
      sql: `update app.download_grants set status = 'revoked'`,
      values: [],
    });

    // act
    const response = await requestDownload(downloadTokenFrom(delivered!));

    // assert
    expect(response.status).toBe(303);
    expect(response.headers.get("Location")).toBe(unavailableDownloadLocation());
  });

  it("sends an expired grant to the unavailable page", async () => {
    // arrange
    await seedPublishedProductVersion();
    await requestAcquisition({
      idempotencyKey: "8f709102-b3c4-40d5-8172-8d9e0f102132",
    });
    const [delivered] = await suite.sentEmails();
    await expireDownloadGrants();

    // act
    const response = await requestDownload(downloadTokenFrom(delivered!));

    // assert
    expect(response.status).toBe(303);
    expect(response.headers.get("Location")).toBe(unavailableDownloadLocation());
  });

  it("sends an unknown token to the unavailable page", async () => {
    // arrange
    await seedPublishedProductVersion();

    // act
    const response = await requestDownload("never-issued-token");

    // assert
    expect(response.status).toBe(303);
    expect(response.headers.get("Location")).toBe(unavailableDownloadLocation());
  });

  it("deduplicates genuinely concurrent acquisitions with one idempotency key", async () => {
    // arrange
    await seedPublishedProductVersion();
    const idempotencyKey = "de355729-300a-4d05-b5a6-cc475c9e46df";

    // act
    const responses = await Promise.all([
      requestAcquisition({ idempotencyKey }),
      requestAcquisition({ idempotencyKey }),
    ]);

    // assert — the loser reads the winner's outcome while it is still in
    // flight, so whether it is told "delivered" or "retry" depends on timing.
    // One of everything must hold either way.
    expect(responses.map((response) => response.status)).not.toContain(500);
    await expect(suite.sentEmails()).resolves.toHaveLength(1);
    const [counts] = await suite.postgres.queryRows<{
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

    // act
    const response = await requestAcquisition({
      idempotencyKey: "fe592267-8f1e-42d2-b40a-52ab0845b748",
      productSlugs: ["hormone-harmony", "removed-guide"],
    });

    // assert
    expect(response.status).toBe(409);
    const counts = await suite.postgres.queryRows<{
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
      { acquisitions: 0, grants: 0, recipients: 0, requests: 0 },
    ]);
  });

  it("does not retry delivery after a pending grant has expired", async () => {
    // arrange
    await seedPublishedProductVersion();
    const idempotencyKey = "70019ed0-f75d-4fc8-9962-95f2be04b10e";
    await suite.wireMock.stub(resendFailsWithoutVerdict(idempotencyKey));
    const initialResponse = await requestAcquisition({ idempotencyKey });
    await expireDownloadGrants();

    // act
    const replayResponse = await requestAcquisition({ idempotencyKey });

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
    const [attemptCount] = await suite.postgres.queryRows<{ count: number }>({
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

  it("revokes the undelivered grant after a definitive provider rejection", async () => {
    // arrange
    await seedPublishedProductVersion();
    const idempotencyKey = "9b9d87c6-b6b4-483d-a0cf-f734d9a65f00";
    await suite.wireMock.stub(resendRejects(idempotencyKey));

    // act
    const response = await requestAcquisition({ idempotencyKey });

    // assert
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "delivery_unavailable" },
      success: false,
    });
    const [deliveryState] = await suite.postgres.queryRows<{
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

  it("declines a repeat request inside the delivery cooldown without persisting anything", async () => {
    // arrange
    await seedPublishedProductVersion();
    const firstResponse = await requestAcquisition({
      idempotencyKey: "1f0c6a2e-5f2b-4f0a-9d2e-0b6a1c3d4e5f",
    });

    // act
    const cooldownResponse = await requestAcquisition({
      idempotencyKey: "2a1b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
    });

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
    await expect(suite.sentEmails()).resolves.toHaveLength(1);
    const [counts] = await suite.postgres.queryRows<{
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

  it("frees the cooldown once the previous delivery has aged out of it", async () => {
    // arrange
    await seedPublishedProductVersion();
    const firstResponse = await requestAcquisition({
      idempotencyKey: "b0000000-0000-4000-8000-000000000001",
    });

    // act
    await ageDeliveryHistory(INSIDE_THE_COOLDOWN);
    const insideCooldownResponse = await requestAcquisition({
      idempotencyKey: "b0000000-0000-4000-8000-000000000002",
    });
    await ageDeliveryHistory(PAST_THE_COOLDOWN);
    const pastCooldownResponse = await requestAcquisition({
      idempotencyKey: "b0000000-0000-4000-8000-000000000003",
    });

    // assert
    expect(firstResponse.status).toBe(201);
    expect(insideCooldownResponse.status).toBe(429);
    expect(pastCooldownResponse.status).toBe(201);
    await expect(suite.sentEmails()).resolves.toHaveLength(2);
  });

  it("declines an exhausted rolling allowance with its own outcome", async () => {
    // arrange
    await seedPublishedProductVersion();
    const idempotencyKeys = Array.from(
      { length: deliveryAllowance + 1 },
      (_unused, index) =>
        `a0000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    );
    const acceptedStatuses: number[] = [];

    for (const idempotencyKey of idempotencyKeys.slice(0, deliveryAllowance)) {
      const response = await requestAcquisition({ idempotencyKey });

      acceptedStatuses.push(response.status);
      // Each delivery clears the cooldown for the next one while staying well
      // inside the day the allowance is counted over.
      await ageDeliveryHistory(PAST_THE_COOLDOWN_INSIDE_A_DAY);
    }

    // act
    const exhaustedResponse = await requestAcquisition({
      idempotencyKey: idempotencyKeys[deliveryAllowance]!,
    });

    // assert
    expect(acceptedStatuses).toEqual(Array(deliveryAllowance).fill(201));
    expect(exhaustedResponse.status).toBe(429);
    await expect(exhaustedResponse.json()).resolves.toEqual({
      error: {
        code: "rate_limited_daily",
        message: "Unable to deliver store resources.",
      },
      success: false,
    });
    await expect(suite.sentEmails()).resolves.toHaveLength(
      deliveryAllowance,
    );
    const [counts] = await suite.postgres.queryRows<{
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
    expect(counts).toEqual({
      grants: deliveryAllowance,
      requests: deliveryAllowance,
    });
  });

  it("shares one allowance across sub-addressed variants of an inbox", async () => {
    // arrange
    await seedPublishedProductVersion();
    const firstResponse = await requestAcquisition({
      email: "woman@example.com",
      idempotencyKey: "c0000000-0000-4000-8000-000000000001",
    });

    // act
    const taggedResponse = await requestAcquisition({
      email: "woman+guides@example.com",
      idempotencyKey: "c0000000-0000-4000-8000-000000000002",
    });

    // assert
    expect(firstResponse.status).toBe(201);
    expect(taggedResponse.status).toBe(429);
    await expect(taggedResponse.json()).resolves.toMatchObject({
      error: { code: "rate_limited_cooldown" },
      success: false,
    });
    await expect(suite.sentEmails()).resolves.toHaveLength(1);
  });

  it("delivers once when a tagged variant races the address it folds onto", async () => {
    // arrange
    await seedPublishedProductVersion();

    // act — these become two recipient rows, so the normalized-email unique
    // index cannot separate them; only serializable isolation over the shared
    // limit key prevents a second delivery.
    const responses = await Promise.all([
      requestAcquisition({
        email: "racer@example.com",
        idempotencyKey: "d0000000-0000-4000-8000-000000000001",
      }),
      requestAcquisition({
        email: "racer+tag@example.com",
        idempotencyKey: "d0000000-0000-4000-8000-000000000002",
      }),
    ]);

    // assert
    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 429,
    ]);
    await expect(suite.sentEmails()).resolves.toHaveLength(1);
  });

  it.each([
    ["a definitive provider rejection", resendRejects],
    ["an ambiguous provider outcome", resendFailsWithoutVerdict],
  ])("releases the allowance after %s", async (_label, refuseDelivery) => {
    // arrange
    await seedPublishedProductVersion();
    const failedKey = "3b2c4d5e-6f70-4b81-9c2d-3e4f5a6b7c8d";
    await suite.wireMock.stub(refuseDelivery(failedKey));
    const failedResponse = await requestAcquisition({
      idempotencyKey: failedKey,
    });

    // act — the same instant, so only a released slot can allow this through
    const response = await requestAcquisition({
      idempotencyKey: "4c3d5e6f-7081-4c92-8d3e-4f5a6b7c8d9e",
    });

    // assert
    expect(failedResponse.status).toBe(503);
    expect(response.status).toBe(201);
    const [attempts] = await suite.postgres.queryRows<{
      accepted: number;
      total: number;
    }>({
      sql: `
        select
          count(*) filter (where status = 'accepted')::int as "accepted",
          count(*)::int as "total"
        from app.delivery_attempts
      `,
      values: [],
    });
    expect(attempts).toEqual({ accepted: 1, total: 2 });
  });

  it("delivers once when two requests for one email arrive together", async () => {
    // arrange
    await seedPublishedProductVersion();

    // act
    const responses = await Promise.all([
      requestAcquisition({
        idempotencyKey: "7f608192-a3b4-4fc5-9061-7c8d9e0f1021",
      }),
      requestAcquisition({
        idempotencyKey: "80719203-b4c5-40d6-8172-8d9e0f102132",
      }),
    ]);

    // assert
    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 429,
    ]);
    await expect(suite.sentEmails()).resolves.toHaveLength(1);
    const [counts] = await suite.postgres.queryRows<{
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

  it("rejects a submission Turnstile does not recognise, before persisting", async () => {
    // arrange
    await seedPublishedProductVersion();

    // act
    const response = await requestAcquisition({
      idempotencyKey: "91829304-c5d6-41e7-9283-9e0f10213243",
      turnstileToken: "never-issued-by-the-widget",
    });

    // assert
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "bot_verification_failed" },
      success: false,
    });
    await expect(suite.sentEmails()).resolves.toEqual([]);
    const [counts] = await suite.postgres.queryRows<{
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

  it("rejects a token minted for another form", async () => {
    // arrange
    await seedPublishedProductVersion();

    // act
    const response = await requestAcquisition({
      idempotencyKey: "a2930415-d6e7-42f8-a394-af1021324354",
      turnstileToken: turnstileTokenForAction(WAITLIST_TURNSTILE_ACTION),
    });

    // assert
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "bot_verification_failed" },
      success: false,
    });
  });
});

async function requestAcquisition(options: {
  email?: string;
  idempotencyKey: string;
  productSlugs?: readonly string[];
  turnstileToken?: string;
}): Promise<Response> {
  const formData = new FormData();
  formData.set(
    "cf-turnstile-response",
    options.turnstileToken ?? storeSubmissionToken,
  );
  formData.set("email", options.email ?? "  WOMAN@Example.com ");
  formData.set("idempotencyKey", options.idempotencyKey);
  formData.set("marketingConsent", "true");
  formData.set(
    "productSlugs",
    JSON.stringify(options.productSlugs ?? ["hormone-harmony"]),
  );
  formData.set("termsAccepted", "true");

  return suite.request(
    new Request(suite.url("/api/store/acquisitions"), {
      body: formData,
      method: "POST",
    }),
  );
}

async function requestDownload(token: string): Promise<Response> {
  const formData = new FormData();
  formData.set("token", token);

  return suite.request(
    new Request(suite.url("/api/store/downloads"), {
      body: formData,
      method: "POST",
    }),
  );
}

function downloadTokenFrom(email: SentEmail): string {
  const [downloadUrl] = /https?:\/\/\S+/.exec(email.text) ?? [];

  if (!downloadUrl) {
    throw new Error("Delivery email carries no download link.");
  }

  return new URL(downloadUrl).hash.slice(1);
}

function unavailableDownloadLocation(): string {
  return suite.path("/store/download?unavailable=1");
}

/**
 * Moves every delivery already made further into the past, which is what the
 * cooldown and the rolling allowance measure — the application asks how long
 * ago it last delivered, and this is how a test answers "longer than that".
 */
async function ageDeliveryHistory(interval: string): Promise<void> {
  await suite.postgres.executeSql({
    sql: `
      update app.delivery_attempts
      set created_at = created_at - $1::interval
    `,
    values: [interval],
  });
}

/** Every grant issued so far, as it looks once its lifetime has run out. */
async function expireDownloadGrants(): Promise<void> {
  await suite.postgres.executeSql({
    sql: `update app.download_grants set expires_at = now() - interval '1 minute'`,
    values: [],
  });
}

async function seedPublishedProductVersion() {
  const assetRoot = suite.assetRoot();
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
  await suite.postgres.executeSql({
    sql: `
      insert into app.products (slug, lifecycle_status, display_order)
      values ('hormone-harmony', 'published', 1)
    `,
    values: [],
  });
  await suite.postgres.executeSql({
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
  await suite.postgres.executeSql({
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
  await suite.postgres.executeSql({
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
  await suite.postgres.executeSql({
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
  await suite.postgres.executeSql({
    sql: `
      update app.product_versions
      set published_at = $1
      where sequence = 1
    `,
    values: [publishedAt],
  });

  return { coverAssetKey };
}

async function seedNextPublishedVersion() {
  const assetRoot = suite.assetRoot();
  const coverAssetKey = "covers/hormone-harmony-v2.webp";
  const assetKey = "products/hormone-harmony-v2.pdf";
  const cover = Buffer.from("cover-version-two");
  const asset = Buffer.from("guide-version-two");

  await Promise.all([
    writeFile(join(assetRoot, coverAssetKey), cover),
    writeFile(join(assetRoot, assetKey), asset),
  ]);
  await suite.postgres.executeSql({
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
  await suite.postgres.executeSql({
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
  await suite.postgres.executeSql({
    sql: `
      update app.product_versions
      set published_at = $1
      where sequence = 2
    `,
    values: [republishedAt],
  });
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}
