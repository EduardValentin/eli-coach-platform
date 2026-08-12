import {
  PRIVACY_POLICY_VERSION,
  WAITLIST_MARKETING_CONSENT_VERSION,
} from "@eli-coach-platform/content";
import { WAITLIST_TURNSTILE_ACTION } from "@eli-coach-platform/infrastructure/bot-detection";
import type {
  WaitlistOffer,
  WaitlistSignupPricing,
} from "@eli-coach-platform/domain";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import {
  waitlistJoinResponseSchema,
  waitlistSchema,
} from "~/features/waitlist/contracts/waitlist";
import { ApiIntegrationTestSuite } from "~integration-test-config/api-integration-test-suite";
import { turnstileTokenForAction } from "~integration-test-config/wire-mock/expectations/turnstile-siteverify";

const suite = new ApiIntegrationTestSuite();
const waitlistSubmissionToken = turnstileTokenForAction(
  WAITLIST_TURNSTILE_ACTION,
);
const activeOffer = {
  plan: "all-bundles",
  campaignSlug: "all-bundles-launch-1",
} satisfies WaitlistOffer;
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

describe.sequential("waitlist API integration", () => {
  beforeAll(async () => {
    await suite.start();
  });

  afterEach(async () => {
    vi.useRealTimers();
    await suite.reset();
  });

  afterAll(async () => {
    await suite.stop();
  });

  it("returns the public waitlist data", async () => {
    // arrange, act
    const response = await requestWaitlist();

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
    // arrange, act
    const response = await requestJoin("  ELI@Example.COM  ");

    // assert
    const body = waitlistJoinResponseSchema.parse(await response.json());
    const rows = await readWaitlistEntries("eli@example.com");
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

  it("confirms a new signup by email", async () => {
    // arrange, act
    await requestJoin("eli@example.com");

    // assert — the signup is answered before the confirmation is sent, so the
    // send is genuinely asynchronous and is waited for rather than assumed.
    await expect
      .poll(async () => suite.sentEmails())
      .toEqual([
        expect.objectContaining({
          subject: expect.stringMatching(/\S/),
          to: "eli@example.com",
        }),
      ]);
  });

  it("refreshes reduced signup consent evidence without changing registration identity", async () => {
    // arrange
    await requestJoin("eli@example.com");
    const [originalRow] = await readWaitlistEntries("eli@example.com");

    if (!originalRow) {
      throw new Error("Expected the original waitlist entry to exist.");
    }

    await ageConsentEvidence(originalRow.id);

    // act
    const duplicateResponse = await requestJoin(" ELI@example.com ");

    // assert
    const body = waitlistJoinResponseSchema.parse(
      await duplicateResponse.json(),
    );
    const refreshedRows = await readWaitlistEntries("eli@example.com");
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
    await requestJoin("eli@example.com");
    const [originalRow] = await readWaitlistEntries("eli@example.com");
    await ageConsentEvidence(originalRow!.id);

    // act
    const response = await requestJoin("eli@example.com", "");

    // assert
    const body = waitlistJoinResponseSchema.parse(await response.json());
    const rows = await readWaitlistEntries("eli@example.com");
    const [row] = rows;

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      success: false,
      error: { code: "bot_verification_failed" },
    });
    if (body.success) {
      throw new Error("Expected bot verification to reject the submission.");
    }
    expect(body.error.message.trim().length).toBeGreaterThan(0);
    expect(rows).toHaveLength(1);
    expect(row).toMatchObject({
      privacyPolicyVersion: "privacy-policy-legacy",
      marketingConsentVersion: "marketing-consent-legacy",
      marketingConsentedAt: new Date(agedConsentTimestamp),
      updatedAt: new Date(agedConsentTimestamp),
    });
  });

  it("rejects a token minted for another form", async () => {
    // arrange, act
    const response = await requestJoin(
      "eli@example.com",
      turnstileTokenForAction("store_acquisition"),
    );

    // assert
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "bot_verification_failed" },
    });
  });

  it("allows the same normalized email to join a different active offer once", async () => {
    // arrange — a signup this deployment's offer cannot produce, because it
    // belongs to the campaign that ran before it
    await seedReducedPricingSignup({
      campaignSlug: "all-bundles-launch-2",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      email: "eli@example.com",
    });

    // act
    const response = await requestJoin(" ELI@example.com ");

    // assert
    expect(response.status).toBe(201);
    const signupCount = await suite.postgres.countRows({
      tableName: "app.waitlist_entries",
      values: ["eli@example.com"],
      whereClause: "email = $1",
    });
    const activeOfferSignupCount = await suite.postgres.countRows({
      tableName: "app.waitlist_entries",
      values: ["eli@example.com", activeOffer.campaignSlug, activeOffer.plan],
      whereClause: "email = $1 and offer_slug = $2 and offer_plan = $3",
    });

    expect(signupCount).toBe(2);
    expect(activeOfferSignupCount).toBe(1);
  });

  it("rejects invalid emails before persistence", async () => {
    // arrange, act
    const response = await requestJoin("not-an-email");

    // assert
    const body = waitlistJoinResponseSchema.parse(await response.json());

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      success: false,
      error: { code: "invalid_email" },
    });
    if (body.success) {
      throw new Error("Expected an invalid email response.");
    }
    expect(body.error.message.trim().length).toBeGreaterThan(0);
  });

  it("rejects missing bot verification before persistence", async () => {
    // arrange, act
    const response = await requestJoin("eli@example.com", "");

    // assert
    const body = waitlistJoinResponseSchema.parse(await response.json());
    const rowCount = await suite.postgres.countRows({
      tableName: "app.waitlist_entries",
      values: ["eli@example.com"],
      whereClause: "email = $1",
    });

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      success: false,
      error: { code: "bot_verification_failed" },
    });
    if (body.success) {
      throw new Error("Expected bot verification to reject the submission.");
    }
    expect(body.error.message.trim().length).toBeGreaterThan(0);
    expect(rowCount).toBe(0);
  });

  it("allows exactly one concurrent reduced pricing signup when one spot remains", async () => {
    // arrange
    for (let index = 0; index < 9; index += 1) {
      await requestJoin(`person-${index}@example.com`);
    }

    // act
    const responses = await Promise.all([
      requestJoin("last-one-a@example.com"),
      requestJoin("last-one-b@example.com"),
    ]);

    // assert
    const statuses = responses.map((response) => response.status).sort();
    const bodies = await Promise.all(
      responses.map(async (response) =>
        waitlistJoinResponseSchema.parse(await response.json()),
      ),
    );
    const reducedPricingSignupCount = await suite.postgres.countRows({
      tableName: "app.waitlist_entries",
      values: [activeOffer.campaignSlug],
      whereClause: "offer_slug = $1 and pricing_eligibility = 'reduced'",
    });
    const regularPricingSignupCount = await suite.postgres.countRows({
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
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-07-26T10:12:00.000Z"));

    for (let index = 0; index < 10; index += 1) {
      await seedReducedPricingSignup({
        createdAt: new Date(),
        email: `person-${index}@example.com`,
      });
    }

    // act
    const response = await requestJoin("regular-pricing@example.com");
    const waitlistResponse = await requestWaitlist();

    // assert
    const body = waitlistJoinResponseSchema.parse(await response.json());
    const regularPricingSignupCount = await suite.postgres.countRows({
      tableName: "app.waitlist_entries",
      values: ["regular-pricing@example.com", activeOffer.campaignSlug],
      whereClause:
        "email = $1 and offer_slug = $2 and pricing_eligibility = 'regular'",
    });
    const reducedPricingSignupCount = await suite.postgres.countRows({
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
    for (let index = 0; index < 10; index += 1) {
      await requestJoin(`person-${index}@example.com`);
    }

    await requestJoin("regular-pricing@example.com");
    await suite.postgres.executeSql({
      sql: `
        delete from app.waitlist_entries
        where email = $1 and offer_slug = $2 and pricing_eligibility = 'reduced'
      `,
      values: ["person-0@example.com", activeOffer.campaignSlug],
    });

    // act
    const duplicateResponse = await requestJoin(
      " REGULAR-PRICING@example.com ",
    );

    // assert
    const body = waitlistJoinResponseSchema.parse(
      await duplicateResponse.json(),
    );
    const regularPricingSignupCount = await suite.postgres.countRows({
      tableName: "app.waitlist_entries",
      values: ["regular-pricing@example.com", activeOffer.campaignSlug],
      whereClause:
        "email = $1 and offer_slug = $2 and pricing_eligibility = 'regular'",
    });

    expect(duplicateResponse.status).toBe(201);
    expect(body).toEqual({ success: true });
    expect(regularPricingSignupCount).toBe(1);
  });

  it("excludes reduced pricing signups created at the current availability bucket boundary", async () => {
    // arrange
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-07-26T10:12:00.000Z"));
    const bucketStart = new Date("2026-07-26T10:00:00.000Z");
    const strictlyBeforeBucketStart = new Date(bucketStart.getTime() - 1);

    for (let index = 0; index < 7; index += 1) {
      await seedReducedPricingSignup({
        createdAt: strictlyBeforeBucketStart,
        email: `older-${index}@example.com`,
      });
    }
    await seedReducedPricingSignup({
      createdAt: bucketStart,
      email: "bucket-boundary@example.com",
    });

    // act
    const response = await requestWaitlist();

    // assert
    const waitlist = waitlistSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(waitlist.availability).toBe("available");
  });
});

async function requestWaitlist(): Promise<Response> {
  return suite.request(new Request(suite.url("/api/waitlist")));
}

async function requestJoin(
  email: string,
  turnstileToken: string = waitlistSubmissionToken,
): Promise<Response> {
  const body = new URLSearchParams({ email });

  if (turnstileToken) {
    body.set("cf-turnstile-response", turnstileToken);
  }

  return suite.request(
    new Request(suite.url("/api/waitlist"), {
      body,
      headers: { "content-type": "application/x-www-form-urlencoded" },
      method: "POST",
    }),
  );
}

async function readWaitlistEntries(email: string): Promise<WaitlistEntryRow[]> {
  return suite.postgres.queryRows<WaitlistEntryRow>({
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
    values: [email, activeOffer.campaignSlug],
  });
}

async function ageConsentEvidence(entryId: number): Promise<void> {
  await suite.postgres.executeSql({
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
      entryId,
    ],
  });
}

async function seedReducedPricingSignup(options: {
  campaignSlug?: string;
  createdAt: Date;
  email: string;
}): Promise<void> {
  await suite.postgres.executeSql({
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
      options.campaignSlug ?? activeOffer.campaignSlug,
      activeOffer.plan,
      PRIVACY_POLICY_VERSION,
      WAITLIST_MARKETING_CONSENT_VERSION,
      options.createdAt,
    ],
  });
}
