import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { WireMockContainer } from "./wire-mock-container";

const resendEmails = {
  request: { method: "POST", urlPath: "/emails" },
  response: {
    status: 200,
    jsonBody: { id: "00000000-0000-0000-0000-000000000000" },
  },
};

const wireMock = new WireMockContainer([resendEmails]);

describe.sequential("WireMock container", () => {
  beforeAll(async () => {
    await wireMock.start();
  });

  afterEach(async () => {
    await wireMock.reset();
  });

  afterAll(async () => {
    await wireMock.stop();
  });

  it("serves a stubbed third party and records what it received", async () => {
    // arrange
    const { RESEND_BASE_URL: resendBaseUrl } = wireMock.settings();

    // act
    const response = await fetch(`${resendBaseUrl}/emails`, {
      body: JSON.stringify({ subject: "Your resources", to: "woman@example.com" }),
      headers: {
        Authorization: "Bearer re_test",
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const recorded = await wireMock.recordedRequests("/emails");

    // assert
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      id: "00000000-0000-0000-0000-000000000000",
    });
    expect(recorded).toHaveLength(1);
    expect(JSON.parse(recorded[0]!.body)).toEqual({
      subject: "Your resources",
      to: "woman@example.com",
    });
    expect(recorded[0]!.headers).toMatchObject({
      Authorization: "Bearer re_test",
    });
  });

  it("forgets recorded requests between test cases", async () => {
    // arrange, act
    const recorded = await wireMock.recordedRequests("/emails");

    // assert
    expect(recorded).toEqual([]);
  });
});
