import {
  PRIVACY_POLICY_VERSION,
  WAITLIST_MARKETING_CONSENT_VERSION,
} from "@eli-coach-platform/content";
import { WAITLIST_TURNSTILE_ACTION } from "@eli-coach-platform/infrastructure/bot-detection";
import {
  WAITLIST_REDUCED_PRICING_CAP,
  type WaitlistOffer,
  type WaitlistSignupPricing,
} from "@eli-coach-platform/domain/waitlist";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { waitlistJoinResponseSchema } from "~/features/waitlist/contracts/waitlist";
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
const AVAILABLE_LABEL = "Reduced-price spots available";
const NORMAL_MODE_CTA = "Book a free call";
/**
 * A moment inside a named availability bucket, and that bucket's own start.
 * The server derives the bucket it reads from its own clock, so pinning that
 * clock is what lets a case name the boundary its arrangement sits on.
 */
const insideAnAvailabilityBucket = new Date("2026-07-26T10:12:00.000Z");
const availabilityBucketStart = new Date("2026-07-26T10:00:00.000Z");

type WaitlistEntryRow = {
  id: number;
  email: string;
  campaignSlug: string;
  offerPlan: string;
  pricing: WaitlistSignupPricing;
  reducedSlot: number | null;
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
    await suite.reset();
  });

  afterAll(async () => {
    await suite.stop();
  });

  it("renders the public waitlist availability on the home page", async () => {
    // arrange, act
    const response = await requestHomePage();

    // assert
    const document = await response.text();

    expect(response.status).toBe(200);
    expect(document).toContain(AVAILABLE_LABEL);
  });

  it("observes persisted mode changes without restarting the server", async () => {
    // arrange
    await switchWaitlistModeOff();

    // act
    const normalModeResponse = await requestHomePage();

    // arrange
    await switchWaitlistModeOn();

    // act
    const waitlistModeResponse = await requestHomePage();

    // assert
    const normalModeDocument = await normalModeResponse.text();
    const waitlistModeDocument = await waitlistModeResponse.text();

    expect(normalModeResponse.status).toBe(200);
    expect(normalModeDocument).toContain(NORMAL_MODE_CTA);
    expect(normalModeDocument).not.toContain(AVAILABLE_LABEL);
    expect(waitlistModeResponse.status).toBe(200);
    expect(waitlistModeDocument).toContain(AVAILABLE_LABEL);
  });

  it("treats a missing persisted mode as disabled", async () => {
    // arrange
    await suite.postgres.executeSql({
      sql: "delete from app.feature_flags where name = $1",
      values: ["WAITLIST_MODE"],
    });

    // act
    const response = await requestHomePage();

    // assert
    const document = await response.text();

    expect(response.status).toBe(200);
    expect(document).toContain(NORMAL_MODE_CTA);
    expect(document).not.toContain(AVAILABLE_LABEL);
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

    // assert — the signup is answered before the confirmation is sent
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
    // arrange — a signup left by the campaign that ran before this one
    await seedReducedPricingSignup({
      campaignSlug: "all-bundles-launch-2",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      email: "eli@example.com",
      reducedSlot: 1,
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
    for (let index = 1; index < WAITLIST_REDUCED_PRICING_CAP; index += 1) {
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
    expect(reducedPricingSignupCount).toBe(WAITLIST_REDUCED_PRICING_CAP);
    expect(regularPricingSignupCount).toBe(1);
  });

  it("accepts every signup in a concurrent burst that exhausts reduced pricing", async () => {
    // arrange
    const earlierSignupCount = WAITLIST_REDUCED_PRICING_CAP - 3;

    for (let index = 0; index < earlierSignupCount; index += 1) {
      await requestJoin(`person-${index}@example.com`);
    }

    // act
    const responses = await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        requestJoin(`burst-${index}@example.com`),
      ),
    );

    // assert
    const statuses = responses.map((response) => response.status);
    const reducedSlots = await readReducedSlots();
    const regularPricingSignupCount = await suite.postgres.countRows({
      tableName: "app.waitlist_entries",
      values: [activeOffer.campaignSlug],
      whereClause:
        "offer_slug = $1 and pricing_eligibility = 'regular' and reduced_slot is null",
    });

    expect(statuses).toEqual(Array.from({ length: 8 }, () => 201));
    expect(reducedSlots).toEqual(everyReducedSlot());
    expect(regularPricingSignupCount).toBe(5);
  });

  it("registers one entry when the same email signs up concurrently", async () => {
    // arrange
    const email = "same-person@example.com";

    // act
    const responses = await Promise.all(
      Array.from({ length: 5 }, () => requestJoin(email)),
    );

    // assert
    const statuses = responses.map((response) => response.status);
    const rows = await readWaitlistEntries(email);

    expect(statuses).toEqual(Array.from({ length: 5 }, () => 201));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ pricing: "reduced", reducedSlot: 1 });
  });

  it("keeps a registered email's reduced slot when it resubmits concurrently", async () => {
    // arrange
    const email = "same-person@example.com";

    await requestJoin("first-person@example.com");
    await requestJoin(email);

    // act
    const responses = await Promise.all(
      Array.from({ length: 5 }, () => requestJoin(email)),
    );

    // assert
    const statuses = responses.map((response) => response.status);
    const rows = await readWaitlistEntries(email);

    expect(statuses).toEqual(Array.from({ length: 5 }, () => 201));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ pricing: "reduced", reducedSlot: 2 });
  });

  it("gives a new signup the lowest free reduced slot", async () => {
    // arrange
    await seedReducedPricingSignup({
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      email: "second-slot@example.com",
      reducedSlot: 2,
    });

    // act
    const response = await requestJoin("newcomer@example.com");

    // assert
    const [row] = await readWaitlistEntries("newcomer@example.com");

    expect(response.status).toBe(201);
    expect(row).toMatchObject({ pricing: "reduced", reducedSlot: 1 });
  });

  it("rejects a write that skips the lock and takes an already taken reduced slot", async () => {
    // arrange
    await requestJoin("slot-holder@example.com");

    // act
    const write = insertEntryDirectly({
      email: "lock-skipper@example.com",
      pricing: "reduced",
      reducedSlot: 1,
    });

    // assert
    await expect(write).rejects.toMatchObject({
      code: "23505",
      constraint: "waitlist_entries_offer_reduced_slot_unique",
    });
  });

  it("accepts the last reduced slot and rejects a slot beyond the reduced pricing cap", async () => {
    // arrange
    const lastSlot = WAITLIST_REDUCED_PRICING_CAP;

    // act
    const [lastSlotWrite] = await Promise.allSettled([
      insertEntryDirectly({
        email: "last-slot@example.com",
        pricing: "reduced",
        reducedSlot: lastSlot,
      }),
    ]);
    const [beyondCapWrite] = await Promise.allSettled([
      insertEntryDirectly({
        email: "beyond-cap@example.com",
        pricing: "reduced",
        reducedSlot: lastSlot + 1,
      }),
    ]);

    // assert
    expect(lastSlotWrite).toEqual({ status: "fulfilled", value: undefined });
    expect(beyondCapWrite).toMatchObject({
      status: "rejected",
      reason: {
        code: "23514",
        constraint: "waitlist_entries_reduced_slot_range",
      },
    });
  });

  it("rejects a reduced price entry without a slot", async () => {
    // arrange, act
    const write = insertEntryDirectly({
      email: "slotless@example.com",
      pricing: "reduced",
      reducedSlot: null,
    });

    // assert
    await expect(write).rejects.toMatchObject({
      code: "23514",
      constraint: "waitlist_entries_reduced_slot_matches_pricing",
    });
  });

  it("registers at the regular price when a write that skipped the lock takes the free reduced slot first", async () => {
    // arrange
    const lockSkipper = await suite.postgres.beginTransaction();

    await lockSkipper.executeSql(
      directInsert({
        email: "lock-skipper@example.com",
        pricing: "reduced",
        reducedSlot: 1,
      }),
    );

    // act
    const pendingResponse = requestJoin("visitor@example.com");

    await waitForAWriteBlockedOnTheOpenTransaction();
    await lockSkipper.commit();
    const response = await pendingResponse;

    // assert
    const body = waitlistJoinResponseSchema.parse(await response.json());
    const [row] = await readWaitlistEntries("visitor@example.com");

    expect(response.status).toBe(201);
    expect(body).toEqual({ success: true });
    expect(row).toMatchObject({ pricing: "regular", reducedSlot: null });
  });

  it("refreshes consent when a write that skipped the lock registers the same email first", async () => {
    // arrange
    const lockSkipper = await suite.postgres.beginTransaction();

    await lockSkipper.executeSql(
      directInsert({
        consentVersion: "legacy",
        email: "visitor@example.com",
        pricing: "regular",
        reducedSlot: null,
      }),
    );

    // act
    const pendingResponse = requestJoin("visitor@example.com");

    await waitForAWriteBlockedOnTheOpenTransaction();
    await lockSkipper.commit();
    const response = await pendingResponse;

    // assert
    const body = waitlistJoinResponseSchema.parse(await response.json());
    const rows = await readWaitlistEntries("visitor@example.com");

    expect(response.status).toBe(201);
    expect(body).toEqual({ success: true });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      pricing: "regular",
      reducedSlot: null,
      privacyPolicyVersion: PRIVACY_POLICY_VERSION,
      marketingConsentVersion: WAITLIST_MARKETING_CONSENT_VERSION,
    });
  });

  it("keeps public availability available while current bucket signups exhaust reduced pricing", async () => {
    // arrange
    await suite.setServerClock(insideAnAvailabilityBucket);

    for (let slot = 1; slot <= WAITLIST_REDUCED_PRICING_CAP; slot += 1) {
      await seedReducedPricingSignup({
        createdAt: insideAnAvailabilityBucket,
        email: `person-${slot}@example.com`,
        reducedSlot: slot,
      });
    }

    // act
    const response = await requestJoin("regular-pricing@example.com");
    const homePage = await requestHomePage();

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

    expect(response.status).toBe(201);
    expect(body).toEqual({ success: true });
    expect(regularPricingSignupCount).toBe(1);
    expect(reducedPricingSignupCount).toBe(10);
    expect(homePage.status).toBe(200);
    expect(await homePage.text()).toContain(AVAILABLE_LABEL);
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
    await suite.setServerClock(insideAnAvailabilityBucket);

    const strictlyBeforeBucketStart = new Date(
      availabilityBucketStart.getTime() - 1,
    );

    for (let slot = 1; slot <= 7; slot += 1) {
      await seedReducedPricingSignup({
        createdAt: strictlyBeforeBucketStart,
        email: `older-${slot}@example.com`,
        reducedSlot: slot,
      });
    }
    await seedReducedPricingSignup({
      createdAt: availabilityBucketStart,
      email: "bucket-boundary@example.com",
      reducedSlot: 8,
    });

    // act
    const response = await requestHomePage();

    // assert
    const document = await response.text();

    expect(response.status).toBe(200);
    expect(document).toContain(AVAILABLE_LABEL);
  });
});

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

async function requestHomePage(): Promise<Response> {
  return suite.request(new Request(suite.url("/")));
}

async function switchWaitlistModeOn(): Promise<void> {
  await suite.postgres.executeSql({
    sql: `
      update app.feature_flags
      set enabled = true, updated_at = now()
      where name = $1
    `,
    values: ["WAITLIST_MODE"],
  });
}

async function switchWaitlistModeOff(): Promise<void> {
  await suite.postgres.executeSql({
    sql: `
      update app.feature_flags
      set enabled = false, updated_at = now()
      where name = $1
    `,
    values: ["WAITLIST_MODE"],
  });
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
        reduced_slot as "reducedSlot",
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
  reducedSlot: number;
}): Promise<void> {
  await suite.postgres.executeSql({
    sql: `
      insert into app.waitlist_entries (
        email,
        offer_slug,
        offer_plan,
        pricing_eligibility,
        reduced_slot,
        privacy_policy_version,
        marketing_consent_version,
        marketing_consented_at,
        created_at,
        updated_at
      )
      values ($1, $2, $3, 'reduced', $4, $5, $6, $7, $7, $7)
    `,
    values: [
      options.email,
      options.campaignSlug ?? activeOffer.campaignSlug,
      activeOffer.plan,
      options.reducedSlot,
      PRIVACY_POLICY_VERSION,
      WAITLIST_MARKETING_CONSENT_VERSION,
      options.createdAt,
    ],
  });
}

async function readReducedSlots(): Promise<number[]> {
  const rows = await suite.postgres.queryRows<{ reducedSlot: number }>({
    sql: `
      select reduced_slot as "reducedSlot"
      from app.waitlist_entries
      where offer_slug = $1 and pricing_eligibility = 'reduced'
      order by reduced_slot
    `,
    values: [activeOffer.campaignSlug],
  });

  return rows.map((row) => row.reducedSlot);
}

function everyReducedSlot(): number[] {
  return Array.from(
    { length: WAITLIST_REDUCED_PRICING_CAP },
    (_, index) => index + 1,
  );
}

type DirectEntry = {
  consentVersion?: string;
  email: string;
  pricing: WaitlistSignupPricing;
  reducedSlot: number | null;
};

function directInsert(entry: DirectEntry): {
  sql: string;
  values: readonly unknown[];
} {
  return {
    sql: `
      insert into app.waitlist_entries (
        email,
        offer_slug,
        offer_plan,
        pricing_eligibility,
        reduced_slot,
        privacy_policy_version,
        marketing_consent_version,
        marketing_consented_at,
        updated_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, now(), now())
    `,
    values: [
      entry.email,
      activeOffer.campaignSlug,
      activeOffer.plan,
      entry.pricing,
      entry.reducedSlot,
      entry.consentVersion ?? PRIVACY_POLICY_VERSION,
      entry.consentVersion ?? WAITLIST_MARKETING_CONSENT_VERSION,
    ],
  };
}

async function insertEntryDirectly(entry: DirectEntry): Promise<void> {
  await suite.postgres.executeSql(directInsert(entry));
}

async function waitForAWriteBlockedOnTheOpenTransaction(): Promise<void> {
  await expect
    .poll(async () =>
      suite.postgres.countRows({
        tableName: "pg_locks",
        values: [],
        whereClause: "not granted",
      }),
    )
    .toBeGreaterThan(0);
}
