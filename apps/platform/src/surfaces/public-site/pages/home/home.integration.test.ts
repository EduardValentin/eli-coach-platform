import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiIntegrationTestSuite } from "~integration-test-config/api-integration-test-suite";

const suite = new ApiIntegrationTestSuite();
const HERO_POSTER_FILE = "media/hero/hero-studio-poster.webp";

describe("home page integration", () => {
  beforeAll(async () => {
    await suite.start();
  });

  afterAll(async () => {
    await suite.stop();
  });

  it("asks the browser to fetch the hero poster first", async () => {
    // arrange
    const request = new Request(suite.url("/"));

    // act
    const response = await suite.request(request);

    // assert
    const posterLinks = posterLinkTagsIn(await response.text());

    expect(response.status).toBe(200);
    expect(posterLinks).toHaveLength(1);
    expect(posterLinks[0]).toMatch(/\brel="preload"/);
    expect(posterLinks[0]).toMatch(/\bas="image"/);
    expect(posterLinks[0]).toMatch(/\bfetchpriority="high"/i);
    expect(posterLinks[0]).toContain(`href="/${HERO_POSTER_FILE}"`);
  });

  it("leaves the hero poster out of other public pages", async () => {
    // arrange
    const request = new Request(suite.url("/blog/"));

    // act
    const response = await suite.request(request);

    // assert
    const posterLinks = posterLinkTagsIn(await response.text());

    expect(response.status).toBe(200);
    expect(posterLinks).toEqual([]);
  });
});

function posterLinkTagsIn(document: string): string[] {
  return (document.match(/<link\b[^>]*>/g) ?? []).filter((tag) =>
    tag.includes(HERO_POSTER_FILE),
  );
}
