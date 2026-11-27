import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { ApiIntegrationTestSuite } from "~integration-test-config/api-integration-test-suite";

const suite = new ApiIntegrationTestSuite();

const PLACEHOLDER_HEADING = "Evoa is almost here.";

describe("coming-soon mode left off", () => {
  beforeAll(async () => {
    await suite.start();
  });

  afterEach(async () => {
    await suite.reset();
  });

  afterAll(async () => {
    await suite.stop();
  });

  it("serves the landing page with no noindex header or robots meta", async () => {
    // arrange, act
    const response = await suite.request(new Request(suite.url("/")));

    // assert
    const page = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-robots-tag")).toBeNull();
    expect(page).not.toContain(PLACEHOLDER_HEADING);
    expect(page).not.toContain('name="robots"');
  });

  it("answers an unknown URL with the Page not found page and a 404", async () => {
    // arrange, act
    const response = await suite.request(
      new Request(suite.url("/a-url-no-route-names")),
    );

    // assert
    expect(response.status).toBe(404);
    expect(await response.text()).toContain("Page not found");
  });

  it("answers a POST to an unknown URL with a 404", async () => {
    // arrange, act
    const response = await suite.request(
      new Request(suite.url("/a-url-no-route-names"), { method: "POST" }),
    );

    // assert
    expect(response.status).toBe(404);
  });

  it("keeps the app's API answering", async () => {
    // arrange, act
    const response = await suite.request(new Request(suite.url("/api/meta")));

    // assert
    expect(response.status).toBe(200);
  });
});
