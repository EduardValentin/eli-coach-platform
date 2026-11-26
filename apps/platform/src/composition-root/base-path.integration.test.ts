import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { ApiIntegrationTestSuite } from "~integration-test-config/api-integration-test-suite";
import { mintSessionToken } from "~integration-test-config/clerk-session";

const suite = new ApiIntegrationTestSuite();
const servedAtTheRoot = suite.path("/") === "/";

const unprovisioned = {
  sessionId: "sess_4bAsEpAtHpReFiXsEsSiOnIdXy",
  subjectId: "user_4bAsEpAtHpReFiXsEsSiOnIdXy",
};

describe("one build served under the prefix the instance starts with", () => {
  beforeAll(async () => {
    await suite.start();
  });

  afterEach(async () => {
    await suite.reset();
  });

  afterAll(async () => {
    await suite.stop();
  });

  it("names every script, stylesheet, font, icon and image of the home page under the prefix, and serves each", async () => {
    // arrange, act
    const document = await (await requestPath("/")).text();

    // assert
    const assetUrls = sameOriginAssetUrlsIn(document);
    const answers = await Promise.all(assetUrls.map(statusOf));

    expect(
      assetUrls.filter((url) => url.endsWith(".js")).length,
    ).toBeGreaterThan(0);
    expect(
      assetUrls.filter((url) => url.endsWith(".css")).length,
    ).toBeGreaterThan(0);
    expect(
      assetUrls.filter((url) => url.endsWith(".woff2")).length,
    ).toBeGreaterThan(0);
    expect(assetUrls).toContain(suite.path("/icon.svg"));
    expect(
      assetUrls.filter((url) => url.includes("/media/")).length,
    ).toBeGreaterThan(0);
    expect(assetUrls.filter((url) => !url.startsWith(suite.path("/")))).toEqual(
      [],
    );
    expect(answers.filter(({ status }) => status !== 200)).toEqual([]);
  });

  it("serves every font the stylesheets point at", async () => {
    // arrange
    const document = await (await requestPath("/")).text();
    const stylesheetUrls = sameOriginAssetUrlsIn(document).filter((url) =>
      url.endsWith(".css"),
    );

    // act
    const fontUrls = (
      await Promise.all(stylesheetUrls.map(fontUrlsReferencedBy))
    ).flat();
    const answers = await Promise.all(fontUrls.map(statusOf));

    // assert
    expect(fontUrls.length).toBeGreaterThan(0);
    expect(fontUrls.filter((url) => !url.startsWith(suite.path("/")))).toEqual(
      [],
    );
    expect(answers.filter(({ status }) => status !== 200)).toEqual([]);
  });

  it("answers the readiness check under the prefix", async () => {
    // arrange, act
    const response = await requestPath("/readyz");

    // assert
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("ok");
  });

  it.skipIf(servedAtTheRoot)("answers nothing outside the prefix", async () => {
    // arrange, act
    const response = await suite.request(
      new Request("http://localhost/readyz"),
    );

    // assert
    expect(response.status).toBe(404);
  });

  it("keeps a redirect inside the prefix", async () => {
    // arrange, act
    const response = await suite.request(
      new Request(suite.url("/api/account"), {
        headers: { authorization: `Bearer ${mintSessionToken(unprovisioned)}` },
      }),
    );

    // assert
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      suite.path("/sign-in-failed"),
    );
  });
});

async function requestPath(target: string): Promise<Response> {
  return suite.request(new Request(suite.url(target)));
}

function sameOriginAssetUrlsIn(document: string): string[] {
  const tags = document.match(/<(link|script|img|video|source)\b[^>]*>/g) ?? [];
  const urls = tags.flatMap((tag) =>
    [...tag.matchAll(/\b(?:href|src|poster)="([^"]+)"/g)].map(([, url = ""]) =>
      url.replaceAll("&amp;", "&"),
    ),
  );

  return [...new Set(urls.filter((url) => url.startsWith("/")))];
}

async function fontUrlsReferencedBy(stylesheetUrl: string): Promise<string[]> {
  const stylesheet = await (
    await suite.request(new Request(`http://localhost${stylesheetUrl}`))
  ).text();
  const references = [...stylesheet.matchAll(/url\(([^)]+\.woff2)\)/g)].map(
    ([, reference = ""]) => reference.replaceAll(/["']/g, ""),
  );

  return [
    ...new Set(
      references.map(
        (reference) =>
          new URL(reference, `http://localhost${stylesheetUrl}`).pathname,
      ),
    ),
  ];
}

async function statusOf(url: string): Promise<{ status: number; url: string }> {
  const response = await suite.request(new Request(`http://localhost${url}`));
  await response.arrayBuffer();

  return { status: response.status, url };
}
