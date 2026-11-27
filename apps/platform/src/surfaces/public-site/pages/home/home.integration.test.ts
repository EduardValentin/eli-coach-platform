import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiIntegrationTestSuite } from "~integration-test-config/api-integration-test-suite";

const suite = new ApiIntegrationTestSuite();
const HERO_POSTER_FILE_PREFIX = "/media/hero/hero-studio-poster-";

describe("home page integration", () => {
  beforeAll(async () => {
    await suite.start();
  });

  afterAll(async () => {
    await suite.stop();
  });

  it("asks the browser to fetch first only the hero poster that fits the screen's orientation", async () => {
    // arrange
    const request = new Request(suite.url("/"));

    // act
    const response = await suite.request(request);

    // assert
    const posterLinks = posterLinkTagsIn(await response.text());

    expect(response.status).toBe(200);
    expect(posterLinks).toHaveLength(2);
    for (const posterLink of posterLinks) {
      expect(posterLink).toMatch(/\brel="preload"/);
      expect(posterLink).toMatch(/\bas="image"/);
      expect(posterLink).toMatch(/\bfetchpriority="high"/i);
    }
    expect(
      posterLinkForScreens(posterLinks, "(orientation: portrait)"),
    ).toContain(`href="${HERO_POSTER_FILE_PREFIX}portrait.webp"`);
    expect(
      posterLinkForScreens(posterLinks, "(orientation: landscape)"),
    ).toContain(`href="${HERO_POSTER_FILE_PREFIX}landscape.webp"`);
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
    tag.includes(HERO_POSTER_FILE_PREFIX),
  );
}

function posterLinkForScreens(
  posterLinks: string[],
  mediaQuery: string,
): string | undefined {
  return posterLinks.find((tag) => tag.includes(`media="${mediaQuery}"`));
}
