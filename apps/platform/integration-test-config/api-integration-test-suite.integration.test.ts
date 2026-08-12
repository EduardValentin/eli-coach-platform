import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { STORE_ACQUISITION_TURNSTILE_ACTION } from "@eli-coach-platform/infrastructure/bot-detection";
import { TurnstileBotVerifier } from "@eli-coach-platform/infrastructure/bot-detection/server";

import { ApiIntegrationTestSuite } from "./api-integration-test-suite";
import {
  TURNSTILE_SITEVERIFY_PATH,
  TURNSTILE_STUBBED_TOKEN,
} from "./wire-mock/expectations/turnstile-siteverify";

const suite = new ApiIntegrationTestSuite();

describe.sequential("ApiIntegrationTestSuite", () => {
  beforeAll(async () => {
    await suite.start();
  });

  afterEach(async () => {
    await suite.reset();
  });

  afterAll(async () => {
    await suite.stop();
  });

  it("builds the application against the containers it started", async () => {
    // arrange, act
    const application = suite.application();

    // assert
    expect(application.storeAcquisitionController).toBeDefined();
    expect(process.env.RESEND_BASE_URL).toBe(suite.wireMock.baseUrl());
    expect(process.env.DATABASE_PORT).toBe(
      suite.postgres.settings().DATABASE_PORT,
    );
    const [{ count }] = await suite.postgres.queryRows<{ count: number }>({
      sql: `select count(*)::int as count from app.products`,
      values: [],
    });
    expect(count).toBe(0);
  });

  it("verifies a real Turnstile submission against the stubbed contract", async () => {
    // arrange
    const verifier = new TurnstileBotVerifier({
      secretKey: "integration-secret",
      siteverifyUrl: `${suite.wireMock.baseUrl()}${TURNSTILE_SITEVERIFY_PATH}`,
    });

    // act
    const verification = await verifier.verifySubmission({
      action: STORE_ACQUISITION_TURNSTILE_ACTION,
      remoteIp: "203.0.113.9",
      token: TURNSTILE_STUBBED_TOKEN,
    });
    const recorded = await suite.wireMock.recordedRequests(
      TURNSTILE_SITEVERIFY_PATH,
    );

    // assert
    expect(verification).toEqual({ status: "verified" });
    expect(recorded).toHaveLength(1);
    expect(recorded[0]!.body).toContain(TURNSTILE_STUBBED_TOKEN);
  });
});
