import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { ApiIntegrationTestSuite } from "~integration-test-config/api-integration-test-suite";
import { clerkWebhook } from "~integration-test-config/clerk-webhook-request";
import { PlatformRig } from "~integration-test-config/platform-rig";
import { stripeWebhook } from "~integration-test-config/stripe-webhook-request";

const suite = new ApiIntegrationTestSuite({
  environment: { COMING_SOON_MODE: "on" },
});
const rig = new PlatformRig(suite);

const PLACEHOLDER_HEADING = "Evoa is almost here.";
const PLACEHOLDER_TITLE = "<title>Evoa — Coming soon</title>";
const A_SUBJECT = "user_5cOmInGsOoNiNtEgRaTiOnXyZ";

const BLOCKED_PAGES = [
  "/",
  "/pricing",
  "/blog",
  "/store",
  "/store/a-product",
  "/book",
  "/privacy",
  "/terms",
  "/invitation",
  "/sign-in-failed",
  "/coach",
  "/client",
  "/a-url-no-route-names",
];

const BLOCKED_NON_PAGES = [
  "/api/store/catalog",
  "/api/feature-flags",
  "/api/meta",
  "/client/manifest.webmanifest",
  "/client/sw.js",
  "/api/no-route-names-this",
  "/wp-login.php",
];

describe("coming-soon mode", () => {
  beforeAll(async () => {
    await suite.start();
  });

  afterEach(async () => {
    await suite.reset();
  });

  afterAll(async () => {
    await suite.stop();
  });

  it.each(BLOCKED_PAGES)(
    "answers %s with the placeholder, noindexed, without a redirect",
    async (path) => {
      // arrange, act
      const response = await suite.request(new Request(suite.url(path)));

      // assert
      const page = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
      expect(response.headers.get("x-robots-tag")).toBe("noindex");
      expect(page).toContain(PLACEHOLDER_HEADING);
      expect(page).toContain(PLACEHOLDER_TITLE);
      expect(page).toContain('<meta name="robots" content="noindex"/>');
    },
  );

  it("renders the placeholder without a script, so it names no bundle", async () => {
    // arrange, act
    const page = await (
      await suite.request(new Request(suite.url("/")))
    ).text();

    // assert
    expect(page).not.toContain("<script");
    expect(page).not.toContain("modulepreload");
  });

  it.each(BLOCKED_NON_PAGES)(
    "answers %s with a plain 404, noindexed, and no placeholder",
    async (path) => {
      // arrange, act
      const response = await suite.request(new Request(suite.url(path)));

      // assert
      expect(response.status).toBe(404);
      expect(response.headers.get("x-robots-tag")).toBe("noindex");
      expect(await response.text()).not.toContain(PLACEHOLDER_HEADING);
    },
  );

  it("answers a single-fetch data request with a 404, not the placeholder", async () => {
    // arrange, act
    const response = await suite.request(
      new Request(suite.url("/pricing.data")),
    );

    // assert
    expect(response.status).toBe(404);
    expect(await response.text()).not.toContain(PLACEHOLDER_HEADING);
  });

  it("refuses a waitlist signup and writes nothing", async () => {
    // arrange
    const before = await waitlistRowCount();

    // act
    const response = await suite.request(
      new Request(suite.url("/api/waitlist"), {
        body: JSON.stringify({ email: "visitor@example.com" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );

    // assert
    expect(response.status).toBe(404);
    expect(await waitlistRowCount()).toBe(before);
  });

  it("answers a POST to an unknown URL with a 404", async () => {
    // arrange, act
    const response = await suite.request(
      new Request(suite.url("/a-url-no-route-names"), { method: "POST" }),
    );

    // assert
    expect(response.status).toBe(404);
    expect(await response.text()).not.toContain(PLACEHOLDER_HEADING);
  });

  it.each(["/readyz", "/client/readyz", "/coach/readyz"])(
    "keeps %s open for its probe",
    async (path) => {
      // arrange, act
      const response = await suite.request(new Request(suite.url(path)));

      // assert
      expect(response.status).toBe(200);
      expect(response.headers.get("x-robots-tag")).toBe("noindex");
    },
  );

  it("processes a signed Clerk webhook", async () => {
    // arrange
    await suite.postgres.executeSql({
      sql: "insert into app.accounts (id, auth_subject_id, role) values (gen_random_uuid(), $1, 'CLIENT')",
      values: [A_SUBJECT],
    });

    // act
    const response = await suite.request(
      clerkWebhook({
        event: { data: { id: A_SUBJECT }, type: "user.deleted" },
        url: suite.url("/api/clerk/webhooks"),
      }),
    );

    // assert
    const [account] = await suite.postgres.queryRows<{
      deleted_at: Date | null;
    }>({
      sql: "select deleted_at from app.accounts where auth_subject_id = $1",
      values: [A_SUBJECT],
    });

    expect(response.status).toBe(200);
    expect(account?.deleted_at).not.toBeNull();
  });

  it("lets a Stripe webhook reach its own signature check, and acknowledges a signed event", async () => {
    // arrange
    const unsigned = new Request(suite.url("/api/stripe/webhooks"), {
      body: "{}",
      method: "POST",
    });
    const signed = stripeWebhook({
      event: { data: { object: {} }, id: "evt_coming_soon", type: "ping" },
      signedAt: new Date(),
      url: suite.url("/api/stripe/webhooks"),
    });

    // act
    const refused = await suite.request(unsigned);
    const acknowledged = await suite.request(signed);

    // assert
    expect(refused.status).toBe(400);
    expect(acknowledged.status).toBe(200);
  });

  it("lets the management API answer for itself", async () => {
    // arrange
    const authorization = await rig.authorizeStorePublishing();
    const target = suite.url("/api/management/store/product-validations");

    // act
    const withCredentials = await suite.request(
      new Request(target, { headers: { authorization }, method: "POST" }),
    );
    const withoutCredentials = await suite.request(
      new Request(target, { method: "POST" }),
    );

    // assert
    expect(withoutCredentials.status).toBe(403);
    expect(withCredentials.status).not.toBe(403);
    expect(withCredentials.status).not.toBe(404);
  });
});

async function waitlistRowCount(): Promise<number> {
  const [row] = await suite.postgres.queryRows<{ count: string }>({
    sql: "select count(*)::text as count from app.waitlist_entries",
    values: [],
  });

  return Number(row?.count ?? "0");
}
