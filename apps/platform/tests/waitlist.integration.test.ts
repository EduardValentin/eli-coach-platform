import { TURNSTILE_TEST_RESPONSE_TOKEN } from "@eli-coach-platform/config";
import {
  waitlistJoinResponseSchema,
  waitlistSnapshotSchema,
} from "@eli-coach-platform/contracts";
import type { WaitlistController } from "../app/modules/waitlist/waitlist-controller.server";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { handleHttpErrorResponse } from "../app/server/http.server";
import { PlatformIntegrationTestContext } from "./support/platform-integration-test-context";

const integrationTestContext = new PlatformIntegrationTestContext();

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
  }, 120000);

  afterEach(async () => {
    await integrationTestContext.resetToBaselineState();
  });

  afterAll(async () => {
    await integrationTestContext.stop();
  });

  it("returns the public waitlist snapshot", async () => {
    const response = await integrationTestContext
      .getPlatformContainer()
      .waitlistController.getSnapshot();
    const body = waitlistSnapshotSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body).toEqual({
      enabled: true,
      cap: 10,
      spotsRemaining: 10,
    });
  });

  it("persists a normalized reduced pricing signup and decrements remaining spots", async () => {
    const controller = integrationTestContext.getPlatformContainer().waitlistController;
    const response = await submitJoinRequest(controller, createJoinRequest("  ELI@Example.COM  "));
    const body = waitlistJoinResponseSchema.parse(await response.json());
    const rowCount = await integrationTestContext.countRows({
      tableName: "app.waitlist_entries",
      values: ["eli@example.com"],
      whereClause: "email = $1",
    });

    expect(response.status).toBe(201);
    expect(body).toEqual({
      pricing: "reduced",
      success: true,
      spotsRemaining: 9,
    });
    expect(rowCount).toBe(1);
  });

  it("rejects duplicate normalized emails without consuming a second reduced pricing spot", async () => {
    const controller = integrationTestContext.getPlatformContainer().waitlistController;

    await submitJoinRequest(controller, createJoinRequest("eli@example.com"));
    const duplicateResponse = await submitJoinRequest(
      controller,
      createJoinRequest(" ELI@example.com "),
    );
    const body = waitlistJoinResponseSchema.parse(await duplicateResponse.json());
    const snapshotResponse = await controller.getSnapshot();
    const snapshot = waitlistSnapshotSchema.parse(await snapshotResponse.json());

    expect(duplicateResponse.status).toBe(409);
    expect(body).toEqual({
      success: false,
      error: {
        code: "already_registered",
        message: "Unable to process waitlist signup.",
      },
    });
    expect(snapshot.spotsRemaining).toBe(9);
  });

  it("rejects invalid emails before persistence", async () => {
    const controller = integrationTestContext.getPlatformContainer().waitlistController;
    const response = await submitJoinRequest(controller, createJoinRequest("not-an-email"));
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
    const controller = integrationTestContext.getPlatformContainer().waitlistController;
    const response = await submitJoinRequest(
      controller,
      createJoinRequest("eli@example.com", ""),
    );
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
    const controller = integrationTestContext.getPlatformContainer().waitlistController;

    for (let index = 0; index < 9; index += 1) {
      await submitJoinRequest(controller, createJoinRequest(`person-${index}@example.com`));
    }

    const responses = await Promise.all([
      submitJoinRequest(controller, createJoinRequest("last-one-a@example.com")),
      submitJoinRequest(controller, createJoinRequest("last-one-b@example.com")),
    ]);
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
    const controller = integrationTestContext.getPlatformContainer().waitlistController;

    for (let index = 0; index < 10; index += 1) {
      await submitJoinRequest(controller, createJoinRequest(`person-${index}@example.com`));
    }

    const response = await submitJoinRequest(
      controller,
      createJoinRequest("regular-pricing@example.com"),
    );
    const body = waitlistJoinResponseSchema.parse(await response.json());
    const regularPricingSignupCount = await integrationTestContext.countRows({
      tableName: "app.waitlist_entries",
      values: ["regular-pricing@example.com"],
      whereClause: "email = $1 and pricing_eligibility = 'regular'",
    });
    const reducedPricingSignupCount = await integrationTestContext.countRows({
      tableName: "app.waitlist_entries",
      values: [],
      whereClause: "pricing_eligibility = 'reduced'",
    });
    const snapshotResponse = await controller.getSnapshot();
    const snapshot = waitlistSnapshotSchema.parse(await snapshotResponse.json());

    expect(response.status).toBe(201);
    expect(body).toEqual({
      pricing: "regular",
      success: true,
      spotsRemaining: 0,
    });
    expect(regularPricingSignupCount).toBe(1);
    expect(reducedPricingSignupCount).toBe(10);
    expect(snapshot.spotsRemaining).toBe(0);
  });

  it("rejects duplicate regular pricing signups after reduced pricing spots are full", async () => {
    const controller = integrationTestContext.getPlatformContainer().waitlistController;

    for (let index = 0; index < 10; index += 1) {
      await submitJoinRequest(controller, createJoinRequest(`person-${index}@example.com`));
    }

    await submitJoinRequest(controller, createJoinRequest("regular-pricing@example.com"));
    const duplicateResponse = await submitJoinRequest(
      controller,
      createJoinRequest(" REGULAR-PRICING@example.com "),
    );
    const body = waitlistJoinResponseSchema.parse(await duplicateResponse.json());
    const regularPricingSignupCount = await integrationTestContext.countRows({
      tableName: "app.waitlist_entries",
      values: ["regular-pricing@example.com"],
      whereClause: "email = $1 and pricing_eligibility = 'regular'",
    });
    const snapshotResponse = await controller.getSnapshot();
    const snapshot = waitlistSnapshotSchema.parse(await snapshotResponse.json());

    expect(duplicateResponse.status).toBe(409);
    expect(body).toEqual({
      success: false,
      error: {
        code: "already_registered",
        message: "Unable to process waitlist signup.",
      },
    });
    expect(regularPricingSignupCount).toBe(1);
    expect(snapshot.spotsRemaining).toBe(0);
  });
});
