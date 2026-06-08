import { TURNSTILE_TEST_RESPONSE_TOKEN } from "@eli-coach-platform/config";
import {
  waitlistJoinResponseSchema,
  waitlistSchema,
} from "@eli-coach-platform/contracts";
import { PostgresWaitlistRepository } from "@eli-coach-platform/db";
import {
  WaitingListService,
  type FeatureFlagReader,
  type WaitlistConfirmationSender,
  type WaitlistOffer,
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
      enabled: true,
      cap: 10,
      offer: activeOffer,
      spotsRemaining: 10,
    });
  });

  it("persists a normalized reduced pricing signup and decrements remaining spots", async () => {
    // arrange
    const controller = integrationTestContext.getPlatformContainer().waitlistController;

    // act
    const response = await submitJoinRequest(controller, createJoinRequest("  ELI@Example.COM  "));

    // assert
    const body = waitlistJoinResponseSchema.parse(await response.json());
    const rowCount = await integrationTestContext.countRows({
      tableName: "app.waitlist_entries",
      values: ["eli@example.com", activeOffer.campaignSlug, activeOffer.plan],
      whereClause: "email = $1 and offer_slug = $2 and offer_plan = $3",
    });

    expect(response.status).toBe(201);
    expect(body).toEqual({
      offer: activeOffer,
      pricing: "reduced",
      success: true,
      spotsRemaining: 9,
    });
    expect(rowCount).toBe(1);
  });

  it("returns success for duplicate normalized emails without consuming a second reduced pricing spot", async () => {
    // arrange
    const controller = integrationTestContext.getPlatformContainer().waitlistController;

    await submitJoinRequest(controller, createJoinRequest("eli@example.com"));

    // act
    const duplicateResponse = await submitJoinRequest(
      controller,
      createJoinRequest(" ELI@example.com "),
    );

    // assert
    const body = waitlistJoinResponseSchema.parse(await duplicateResponse.json());
    const rowCount = await integrationTestContext.countRows({
      tableName: "app.waitlist_entries",
      values: ["eli@example.com", activeOffer.campaignSlug],
      whereClause: "email = $1 and offer_slug = $2",
    });
    const waitlistResponse = await controller.getWaitlist();
    const waitlist = waitlistSchema.parse(await waitlistResponse.json());

    expect(duplicateResponse.status).toBe(201);
    expect(body).toEqual({
      offer: activeOffer,
      pricing: "reduced",
      success: true,
      spotsRemaining: 8,
    });
    expect(rowCount).toBe(1);
    expect(waitlist.spotsRemaining).toBe(9);
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
      offer: nextOffer,
      pricing: "reduced",
      status: "registered",
      spotsRemaining: 9,
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
    const reducedPricingSignupCount = bodies.filter(
      (body) => body.success && body.pricing === "reduced",
    ).length;
    const regularPricingSignupCount = bodies.filter(
      (body) => body.success && body.pricing === "regular",
    ).length;

    expect(statuses).toEqual([201, 201]);
    expect(reducedPricingSignupCount).toBe(1);
    expect(regularPricingSignupCount).toBe(1);
  });

  it("collects regular pricing signups when reduced pricing spots are full", async () => {
    // arrange
    const controller = integrationTestContext.getPlatformContainer().waitlistController;

    for (let index = 0; index < 10; index += 1) {
      await submitJoinRequest(controller, createJoinRequest(`person-${index}@example.com`));
    }

    // act
    const response = await submitJoinRequest(
      controller,
      createJoinRequest("regular-pricing@example.com"),
    );

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
    const waitlistResponse = await controller.getWaitlist();
    const waitlist = waitlistSchema.parse(await waitlistResponse.json());

    expect(response.status).toBe(201);
    expect(body).toEqual({
      offer: activeOffer,
      pricing: "regular",
      success: true,
      spotsRemaining: 0,
    });
    expect(regularPricingSignupCount).toBe(1);
    expect(reducedPricingSignupCount).toBe(10);
    expect(waitlist.spotsRemaining).toBe(0);
  });

  it("returns success for duplicate regular pricing signups after reduced pricing spots are full", async () => {
    // arrange
    const controller = integrationTestContext.getPlatformContainer().waitlistController;

    for (let index = 0; index < 10; index += 1) {
      await submitJoinRequest(controller, createJoinRequest(`person-${index}@example.com`));
    }

    await submitJoinRequest(controller, createJoinRequest("regular-pricing@example.com"));

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
    const waitlistResponse = await controller.getWaitlist();
    const waitlist = waitlistSchema.parse(await waitlistResponse.json());

    expect(duplicateResponse.status).toBe(201);
    expect(body).toEqual({
      offer: activeOffer,
      pricing: "regular",
      success: true,
      spotsRemaining: 0,
    });
    expect(regularPricingSignupCount).toBe(1);
    expect(waitlist.spotsRemaining).toBe(0);
  });
});

function createWaitlistServiceForOffer(offer: WaitlistOffer): WaitingListService {
  const container = integrationTestContext.getPlatformContainer();

  return new WaitingListService({
    cap: 10,
    confirmationSender: createNoopConfirmationSender(),
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
