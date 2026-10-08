import { WAITLIST_TURNSTILE_ACTION } from "@eli-coach-platform/infrastructure/bot-detection";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { ApiIntegrationTestSuite } from "~integration-test-config/api-integration-test-suite";
import { turnstileTokenForAction } from "~integration-test-config/wire-mock/expectations/turnstile-siteverify";

const suite = new ApiIntegrationTestSuite();
const EMAIL = "ana@example.com";

describe.sequential("cross-site requests", () => {
  beforeAll(async () => {
    await suite.start();
  });

  afterEach(async () => {
    await suite.reset();
  });

  afterAll(async () => {
    await suite.stop();
  });

  it.each([
    {
      sender: "a cross-site page",
      headers: { "Sec-Fetch-Site": "cross-site" },
    },
    {
      sender: "a same-site page on another origin",
      headers: { "Sec-Fetch-Site": "same-site" },
    },
    {
      sender: "a foreign origin whose browser sends no fetch metadata",
      headers: { Origin: "https://attacker.example" },
    },
    {
      sender: "an opaque origin whose browser sends no fetch metadata",
      headers: { Origin: "null" },
    },
  ])("refuses a POST from $sender and keeps nothing", async ({ headers }) => {
    // arrange
    const request = joinRequest(headers);

    // act
    const response = await suite.request(request);

    // assert
    expect(response.status).toBe(403);
    expect(await response.text()).toBe("Cross-site request refused.");
    expect(await waitlistEntryCount()).toBe(0);
  });

  it.each([
    {
      sender: "a page of the same origin",
      headers: { "Sec-Fetch-Site": "same-origin" },
    },
    {
      sender: "a server that sends neither fetch metadata nor an origin",
      headers: {},
    },
  ])("processes a POST from $sender as before", async ({ headers }) => {
    // arrange
    const request = joinRequest(headers);

    // act
    const response = await suite.request(request);

    // assert
    expect(response.status).toBe(201);
    expect(await waitlistEntryCount()).toBe(1);
  });

  it("serves a cross-site GET as before", async () => {
    // arrange
    const request = new Request(suite.url("/"), {
      headers: { "Sec-Fetch-Site": "cross-site" },
    });

    // act
    const response = await suite.request(request);

    // assert
    expect(response.status).toBe(200);
  });
});

function joinRequest(headers: Record<string, string>): Request {
  return new Request(suite.url("/api/waitlist"), {
    body: new URLSearchParams({
      email: EMAIL,
      "cf-turnstile-response": turnstileTokenForAction(
        WAITLIST_TURNSTILE_ACTION,
      ),
    }),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      ...headers,
    },
    method: "POST",
  });
}

async function waitlistEntryCount(): Promise<number> {
  const rows = await suite.postgres.queryRows<{ email: string }>({
    sql: "select email from app.waitlist_entries where email = $1",
    values: [EMAIL],
  });

  return rows.length;
}
