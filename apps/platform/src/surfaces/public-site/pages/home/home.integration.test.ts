import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiIntegrationTestSuite } from "~integration-test-config/api-integration-test-suite";

const suite = new ApiIntegrationTestSuite();
const HERO_POSTER_FILE_NAME_PREFIX = "hero-studio-poster-";

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
    ).toMatch(builtPosterHrefPattern("portrait"));
    expect(
      posterLinkForScreens(posterLinks, "(orientation: landscape)"),
    ).toMatch(builtPosterHrefPattern("landscape"));
  });

  it("lets a browser keep a hero poster for a year without asking again", async () => {
    // arrange
    const homePage = await suite.request(new Request(suite.url("/")));
    const posterPath = firstPosterPathIn(await homePage.text());

    // act
    const response = await suite.request(new Request(suite.url(posterPath)));

    // assert
    const cachePolicy = response.headers.get("cache-control");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(cachePolicy).toMatch(/\bmax-age=31536000\b/);
    expect(cachePolicy).toMatch(/\bimmutable\b/);
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
    tag.includes(HERO_POSTER_FILE_NAME_PREFIX),
  );
}

function posterLinkForScreens(
  posterLinks: string[],
  mediaQuery: string,
): string | undefined {
  return posterLinks.find((tag) => tag.includes(`media="${mediaQuery}"`));
}

function builtPosterHrefPattern(orientation: string): RegExp {
  return new RegExp(
    `\\bhref="/assets/${HERO_POSTER_FILE_NAME_PREFIX}${orientation}-[\\w-]+\\.webp"`,
  );
}

function firstPosterPathIn(document: string): string {
  const [posterLink] = posterLinkTagsIn(document);
  const posterPath = posterLink?.match(/\bhref="([^"]+)"/)?.[1];

  if (!posterPath) {
    throw new Error("Expected the home page to preload a hero poster.");
  }

  return posterPath;
}
