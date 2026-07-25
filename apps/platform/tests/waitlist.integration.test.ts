import { TURNSTILE_TEST_RESPONSE_TOKEN } from "@eli-coach-platform/config";
import {
  waitlistJoinResponseSchema,
  waitlistSchema,
} from "@eli-coach-platform/contracts";
import {
  PRIVACY_POLICY_VERSION,
  WAITLIST_MARKETING_CONSENT_VERSION,
} from "@eli-coach-platform/content";
import { PostgresWaitlistRepository } from "@eli-coach-platform/db";
import {
  WaitingListService,
  type FeatureFlagReader,
  type WaitlistConfirmationSender,
  type WaitlistConsentVersions,
  type WaitlistOffer,
  type WaitlistSignupPricing,
} from "@eli-coach-platform/domain";
import type { WaitlistController } from "../app/modules/waitlist/waitlist-controller.server";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { handleHttpErrorResponse } from "../app/server/http.server";
import { PlatformIntegrationTestContext } from "./support/platform-integration-test-context";

const integrationTestContext = new PlatformIntegrationTestContext();
const integrationHookTimeoutMs = 120_000;
const activeOffer = {
  plan: "all-bundles",
  campaignSlug: "all-bundles-launch-1",
} satisfies WaitlistOffer;
const consentVersions = {
  privacyPolicyVersion: PRIVACY_POLICY_VERSION,
  marketingConsentVersion: WAITLIST_MARKETING_CONSENT_VERSION,
} satisfies WaitlistConsentVersions;
const agedConsentTimestamp = "2025-01-01T00:00:00.000Z";

type WaitlistEntryRow = {
  id: number;
  email: string;
  campaignSlug: string;
  offerPlan: string;
  pricing: WaitlistSignupPricing;
  privacyPolicyVersion: string;
  marketingConsentVersion: string;
  marketingConsentedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

function createJoinRequest(
  email: string,
  turnstileToken = TURNSTILE_TEST_RESPONSE_TOKEN,
): Request {
  const body = new URLSearchParams({ email });

  if (turnstileToken) {
    body.set("cf-turnstile-response", turnstileToken);
  }

  return new Request("http://localhost/api/waitlist", {
    body,
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });
}

async function submitJoinRequest(
  controller: WaitlistController,
  request: Request,
): Promise<Response> {
  return handleHttpErrorResponse(() => controller.join(request));
}

describe.sequential("waitlist API integration", () => {
  beforeAll(async () => {
    await integrationTestContext.start();
    await integrationTestContext.resetToBaselineState();
  }, integrationHookTimeoutMs);

  afterEach(async () => {
    await integrationTestContext.resetToBaselineState();
  }, integrationHookTimeoutMs);

  afterAll(async () => {
    await integrationTestContext.stop();
  }, integrationHookTimeoutMs);

  it("returns the public waitlist data", async () => {
    // arrange
    const controller = integrationTestContext.getPlatformContainer().waitlistController;

    // act
    const response = await controller.getWaitlist();

    // assert
    const body = waitlistSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body).toEqual({
      availability: "available",
      enabled: true,
      offer: activeOffer,
    });
  });

  it("persists normalized signup consent evidence after a generic success response", async () => {
    // arrange
    const controller = integrationTestContext.getPlatformContainer().waitlistController;

    // act
    const response = await submitJoinRequest(controller, createJoinRequest("  ELI@Example.COM  "));

    // assert
    const body = waitlistJoinResponseSchema.parse(await response.json());
    const rows = await integrationTestContext.queryRows<WaitlistEntryRow>({
      sql: `
        select
          id,
          email,
          offer_slug as "campaignSlug",
          offer_plan as "offerPlan",
          pricing_eligibility as "pricing",
          privacy_policy_version as "privacyPolicyVersion",
          marketing_consent_version as "marketingConsentVersion",
          marketing_consented_at as "marketingConsentedAt",
          created_at as "createdAt",
          updated_at as "updatedAt"
        from app.waitlist_entries
        where email = $1 and offer_slug = $2
      `,
      values: ["eli@example.com", activeOffer.campaignSlug],
    });
    const [row] = rows;

    expect(response.status).toBe(201);
    expect(body).toEqual({ success: true });
    expect(rows).toHaveLength(1);
    expect(row).toMatchObject({
      email: "eli@example.com",
      campaignSlug: activeOffer.campaignSlug,
      offerPlan: activeOffer.plan,
      pricing: "reduced",
      privacyPolicyVersion: PRIVACY_POLICY_VERSION,
      marketingConsentVersion: WAITLIST_MARKETING_CONSENT_VERSION,
    });
    expect(row?.marketingConsentedAt).toBeInstanceOf(Date);
    expect(row?.createdAt).toBeInstanceOf(Date);
    expect(row?.updatedAt).toBeInstanceOf(Date);
  });

  it("refreshes reduced signup consent evidence without changing registration identity", async () => {
    // arrange
    const controller = integrationTestContext.getPlatformContainer().waitlistController;

    await submitJoinRequest(controller, createJoinRequest("eli@example.com"));
    const originalRows = await integrationTestContext.queryRows<WaitlistEntryRow>({
      sql: `
        select
          id,
          email,
          offer_slug as "campaignSlug",
          offer_plan as "offerPlan",
          pricing_eligibility as "pricing",
          privacy_policy_version as "privacyPolicyVersion",
          marketing_consent_version as "marketingConsentVersion",
          marketing_consented_at as "marketingConsentedAt",
          created_at as "createdAt",
          updated_at as "updatedAt"
        from app.waitlist_entries
        where email = $1 and offer_slug = $2
      `,
      values: ["eli@example.com", activeOffer.campaignSlug],
    });
    const [originalRow] = originalRows;

    if (!originalRow) {
      throw new Error("Expected the original waitlist entry to exist.");
    }

    await integrationTestContext.executeSql({
      sql: `
        update app.waitlist_entries
        set privacy_policy_version = $1,
          marketing_consent_version = $2,
          marketing_consented_at = $3,
          updated_at = $3
        where id = $4
      `,
      values: [
        "privacy-policy-legacy",
        "marketing-consent-legacy",
        agedConsentTimestamp,
        originalRow.id,
      ],
    });

    // act
    const duplicateResponse = await submitJoinRequest(
      controller,
      createJoinRequest(" ELI@example.com "),
    );

    // assert
    const body = waitlistJoinResponseSchema.parse(await duplicateResponse.json());
    const refreshedRows = await integrationTestContext.queryRows<WaitlistEntryRow>({
      sql: `
        select
          id,
          email,
          offer_slug as "campaignSlug",
          offer_plan as "offerPlan",
          pricing_eligibility as "pricing",
          privacy_policy_version as "privacyPolicyVersion",
          marketing_consent_version as "marketingConsentVersion",
          marketing_consented_at as "marketingConsentedAt",
          created_at as "createdAt",
          updated_at as "updatedAt"
        from app.waitlist_entries
        where email = $1 and offer_slug = $2
      `,
      values: ["eli@example.com", activeOffer.campaignSlug],
    });
    const refreshedRow = refreshedRows[0]!;

    expect(duplicateResponse.status).toBe(201);
    expect(body).toEqual({ success: true });
    expect(refreshedRows).toHaveLength(1);
    expect(refreshedRow).toMatchObject({
      id: originalRow.id,
      email: originalRow.email,
      campaignSlug: originalRow.campaignSlug,
      offerPlan: originalRow.offerPlan,
      pricing: originalRow.pricing,
      privacyPolicyVersion: PRIVACY_POLICY_VERSION,
      marketingConsentVersion: WAITLIST_MARKETING_CONSENT_VERSION,
      createdAt: originalRow.createdAt,
    });
    expect(refreshedRow.marketingConsentedAt.getTime()).toBeGreaterThan(
      new Date(agedConsentTimestamp).getTime(),
    );
    expect(refreshedRow.updatedAt.getTime()).toBeGreaterThan(
      new Date(agedConsentTimestamp).getTime(),
    );
  });

  it("does not refresh existing signup evidence without bot verification", async () => {
    // arrange
    const controller = integrationTestContext.getPlatformContainer().waitlistController;

    await submitJoinRequest(controller, createJoinRequest("eli@example.com"));
    await integrationTestContext.executeSql({
      sql: `
        update app.waitlist_entries
        set privacy_policy_version = $1,
          marketing_consent_version = $2,
          marketing_consented_at = $3,
          updated_at = $3
        where email = $4 and offer_slug = $5
      `,
      values: [
        "privacy-policy-legacy",
        "marketing-consent-legacy",
        agedConsentTimestamp,
        "eli@example.com",
        activeOffer.campaignSlug,
      ],
    });

    // act
    const response = await submitJoinRequest(
      controller,
      createJoinRequest("eli@example.com", ""),
    );

    // assert
    const body = waitlistJoinResponseSchema.parse(await response.json());
    const rows = await integrationTestContext.queryRows<WaitlistEntryRow>({
      sql: `
        select
          id,
          email,
          offer_slug as "campaignSlug",
          offer_plan as "offerPlan",
          pricing_eligibility as "pricing",
          privacy_policy_version as "privacyPolicyVersion",
          marketing_consent_version as "marketingConsentVersion",
          marketing_consented_at as "marketingConsentedAt",
          created_at as "createdAt",
          updated_at as "updatedAt"
        from app.waitlist_entries
        where email = $1 and offer_slug = $2
      `,
      values: ["eli@example.com", activeOffer.campaignSlug],
    });
    const [row] = rows;

    expect(response.status).toBe(400);
    expect(body).toEqual({
      success: false,
      error: {
        code: "bot_verification_failed",
        message: "Unable to process waitlist signup.",
      },
    });
    expect(rows).toHaveLength(1);
    expect(row).toMatchObject({
      privacyPolicyVersion: "privacy-policy-legacy",
      marketingConsentVersion: "marketing-consent-legacy",
      marketingConsentedAt: new Date(agedConsentTimestamp),
      updatedAt: new Date(agedConsentTimestamp),
    });
  });

  it("allows the same normalized email to join a different active offer once", async () => {
    // arrange
    const controller = integrationTestContext.getPlatformContainer().waitlistController;
    const nextOffer = {
      plan: "all-bundles",
      campaignSlug: "all-bundles-launch-2",
    } satisfies WaitlistOffer;
    const nextOfferService = createWaitlistServiceForOffer(nextOffer);

    await submitJoinRequest(controller, createJoinRequest("eli@example.com"));

    // act
    const nextOfferJoinResult = await nextOfferService.joinWaitlist({
      email: " ELI@example.com ",
    });

    // assert
    expect(nextOfferJoinResult).toEqual({
      pricing: "reduced",
      status: "registered",
    });

    const rowCount = await integrationTestContext.countRows({
      tableName: "app.waitlist_entries",
      values: ["eli@example.com"],
      whereClause: "email = $1",
    });
    const nextOfferRowCount = await integrationTestContext.countRows({
      tableName: "app.waitlist_entries",
      values: ["eli@example.com", nextOffer.campaignSlug, nextOffer.plan],
      whereClause: "email = $1 and offer_slug = $2 and offer_plan = $3",
    });

    expect(rowCount).toBe(2);
    expect(nextOfferRowCount).toBe(1);
  });

  it("rejects invalid emails before persistence", async () => {
    // arrange
    const controller = integrationTestContext.getPlatformContainer().waitlistController;

    // act
    const response = await submitJoinRequest(controller, createJoinRequest("not-an-email"));

    // assert
    const body = waitlistJoinResponseSchema.parse(await response.json());

    expect(response.status).toBe(400);
    expect(body).toEqual({
      success: false,
      error: {
        code: "invalid_email",
        message: "Unable to process waitlist signup.",
      },
    });
  });

  it("rejects missing bot verification before persistence", async () => {
    // arrange
    const controller = integrationTestContext.getPlatformContainer().waitlistController;

    // act
    const response = await submitJoinRequest(
      controller,
      createJoinRequest("eli@example.com", ""),
    );

    // assert
    const body = waitlistJoinResponseSchema.parse(await response.json());
    const rowCount = await integrationTestContext.countRows({
      tableName: "app.waitlist_entries",
      values: ["eli@example.com"],
      whereClause: "email = $1",
    });

    expect(response.status).toBe(400);
    expect(body).toEqual({
      success: false,
      error: {
        code: "bot_verification_failed",
        message: "Unable to process waitlist signup.",
      },
    });
    expect(rowCount).toBe(0);
  });

  it("allows exactly one concurrent reduced pricing signup when one spot remains", async () => {
    // arrange
    const controller = integrationTestContext.getPlatformContainer().waitlistController;

    for (let index = 0; index < 9; index += 1) {
      await submitJoinRequest(controller, createJoinRequest(`person-${index}@example.com`));
    }

    // act
    const responses = await Promise.all([
      submitJoinRequest(controller, createJoinRequest("last-one-a@example.com")),
      submitJoinRequest(controller, createJoinRequest("last-one-b@example.com")),
    ]);

    // assert
    const statuses = responses.map((response) => response.status).sort();
    const bodies = await Promise.all(
      responses.map(async (response) => waitlistJoinResponseSchema.parse(await response.json())),
    );
    const reducedPricingSignupCount = await integrationTestContext.countRows({
      tableName: "app.waitlist_entries",
      values: [activeOffer.campaignSlug],
      whereClause: "offer_slug = $1 and pricing_eligibility = 'reduced'",
    });
    const regularPricingSignupCount = await integrationTestContext.countRows({
      tableName: "app.waitlist_entries",
      values: [activeOffer.campaignSlug],
      whereClause: "offer_slug = $1 and pricing_eligibility = 'regular'",
    });

    expect(statuses).toEqual([201, 201]);
    expect(bodies).toEqual([{ success: true }, { success: true }]);
    expect(reducedPricingSignupCount).toBe(10);
    expect(regularPricingSignupCount).toBe(1);
  });

  it("keeps public availability available while current bucket signups exhaust reduced pricing", async () => {
    // arrange
    const controller = integrationTestContext.getPlatformContainer().waitlistController;

    for (let index = 0; index < 10; index += 1) {
      await seedReducedPricingSignup({
        createdAt: new Date(),
        email: `person-${index}@example.com`,
      });
    }

    // act
    const response = await submitJoinRequest(
      controller,
      createJoinRequest("regular-pricing@example.com"),
    );
    const waitlistResponse = await controller.getWaitlist();

    // assert
    const body = waitlistJoinResponseSchema.parse(await response.json());
    const regularPricingSignupCount = await integrationTestContext.countRows({
      tableName: "app.waitlist_entries",
      values: ["regular-pricing@example.com", activeOffer.campaignSlug],
      whereClause: "email = $1 and offer_slug = $2 and pricing_eligibility = 'regular'",
    });
    const reducedPricingSignupCount = await integrationTestContext.countRows({
      tableName: "app.waitlist_entries",
      values: [activeOffer.campaignSlug],
      whereClause: "offer_slug = $1 and pricing_eligibility = 'reduced'",
    });
    const waitlist = waitlistSchema.parse(await waitlistResponse.json());

    expect(response.status).toBe(201);
    expect(body).toEqual({ success: true });
    expect(regularPricingSignupCount).toBe(1);
    expect(reducedPricingSignupCount).toBe(10);
    expect(waitlist.availability).toBe("available");
  });

  it("keeps a regular signup at regular pricing after reduced capacity reopens", async () => {
    // arrange
    const controller = integrationTestContext.getPlatformContainer().waitlistController;

    for (let index = 0; index < 10; index += 1) {
      await submitJoinRequest(controller, createJoinRequest(`person-${index}@example.com`));
    }

    await submitJoinRequest(controller, createJoinRequest("regular-pricing@example.com"));
    await integrationTestContext.executeSql({
      sql: `
        delete from app.waitlist_entries
        where email = $1 and offer_slug = $2 and pricing_eligibility = 'reduced'
      `,
      values: ["person-0@example.com", activeOffer.campaignSlug],
    });

    // act
    const duplicateResponse = await submitJoinRequest(
      controller,
      createJoinRequest(" REGULAR-PRICING@example.com "),
    );

    // assert
    const body = waitlistJoinResponseSchema.parse(await duplicateResponse.json());
    const regularPricingSignupCount = await integrationTestContext.countRows({
      tableName: "app.waitlist_entries",
      values: ["regular-pricing@example.com", activeOffer.campaignSlug],
      whereClause: "email = $1 and offer_slug = $2 and pricing_eligibility = 'regular'",
    });

    expect(duplicateResponse.status).toBe(201);
    expect(body).toEqual({ success: true });
    expect(regularPricingSignupCount).toBe(1);
  });

  it("includes only reduced pricing signups created before the current availability bucket", async () => {
    // arrange
    const controller = integrationTestContext.getPlatformContainer().waitlistController;
    const now = new Date();

    await seedReducedPricingSignup({
      createdAt: new Date(now.getTime() - 31 * 60 * 1000),
      email: "older@example.com",
    });
    await seedReducedPricingSignup({
      createdAt: now,
      email: "current@example.com",
    });

    // act
    const response = await controller.getWaitlist();

    // assert
    const waitlist = waitlistSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(waitlist.availability).toBe("available");
  });
});

async function seedReducedPricingSignup(options: { createdAt: Date; email: string }): Promise<void> {
  await integrationTestContext.executeSql({
    sql: `
      insert into app.waitlist_entries (
        email,
        offer_slug,
        offer_plan,
        pricing_eligibility,
        privacy_policy_version,
        marketing_consent_version,
        marketing_consented_at,
        created_at,
        updated_at
      )
      values ($1, $2, $3, 'reduced', $4, $5, $6, $6, $6)
    `,
    values: [
      options.email,
      activeOffer.campaignSlug,
      activeOffer.plan,
      consentVersions.privacyPolicyVersion,
      consentVersions.marketingConsentVersion,
      options.createdAt,
    ],
  });
}

function createWaitlistServiceForOffer(offer: WaitlistOffer): WaitingListService {
  const container = integrationTestContext.getPlatformContainer();

  return new WaitingListService({
    cap: 10,
    confirmationSender: createNoopConfirmationSender(),
    consentVersions,
    featureFlagReader: createEnabledFeatureFlagReader(),
    offer,
    repository: new PostgresWaitlistRepository(container.databaseClient),
  });
}

function createNoopConfirmationSender(): WaitlistConfirmationSender {
  return {
    sendConfirmation: vi.fn().mockResolvedValue(undefined),
  };
}

function createEnabledFeatureFlagReader(): FeatureFlagReader {
  return {
    getFeatureFlags: vi.fn().mockResolvedValue({ WAITLIST_MODE: true }),
  };
}
