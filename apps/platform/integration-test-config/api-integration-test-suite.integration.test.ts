import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { ApiIntegrationTestSuite } from "./api-integration-test-suite";

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

});
