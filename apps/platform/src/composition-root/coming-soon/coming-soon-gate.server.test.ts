import type { MiddlewareFunction } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { isComingSoonMarker } from "~/shared/http/coming-soon-marker";

import { ComingSoonGate } from "./coming-soon-gate.server";
import type { ComingSoonMode } from "./config.server";

type Args = Parameters<MiddlewareFunction<Response>>[0];

function argsFor(options: {
  method?: string;
  pattern: string;
  url?: string;
}): Args {
  return {
    pattern: options.pattern,
    request: new Request(options.url ?? "http://localhost/anything", {
      method: options.method ?? "GET",
    }),
  } as unknown as Args;
}

function ok() {
  return vi.fn().mockResolvedValue(new Response("page"));
}

function gate(mode: ComingSoonMode) {
  return new ComingSoonGate(mode);
}

function thrownBy(call: () => unknown): unknown {
  try {
    call();
  } catch (thrown) {
    return thrown;
  }

  return undefined;
}

describe("ComingSoonGate when off", () => {
  it("passes every request through without a header", async () => {
    // arrange
    const next = ok();
    const off = gate("off");

    // act
    const blocked = await off.blockUnlessOpen(argsFor({ pattern: "/" }), next);
    const response = await off.noIndex(argsFor({ pattern: "/" }), next);

    // assert
    expect(blocked).toBeInstanceOf(Response);
    expect(response.headers.get("x-robots-tag")).toBeNull();
    expect(next).toHaveBeenCalledTimes(2);
  });
});

describe("ComingSoonGate when on", () => {
  it("marks every response noindex", async () => {
    // arrange
    const next = ok();

    // act
    const response = await gate("on").noIndex(argsFor({ pattern: "/" }), next);

    // assert
    expect(response.headers.get("x-robots-tag")).toBe("noindex");
  });

  it.each([
    "/readyz",
    "/client/readyz",
    "/coach/readyz",
    "/api/clerk/webhooks",
    "/api/stripe/webhooks",
    "/api/management/store/products",
    "/api/management/store/products/:productId/prices",
  ])("lets %s through", async (pattern) => {
    // arrange
    const next = ok();

    // act
    await gate("on").blockUnlessOpen(argsFor({ pattern }), next);

    // assert
    expect(next).toHaveBeenCalledTimes(1);
  });

  it.each(["/readyz", "/api/clerk/webhooks", "/api/management/store/products"])(
    "marks the open route %s noindex too",
    async (pattern) => {
      // arrange
      const next = ok();

      // act
      const response = await gate("on").noIndex(argsFor({ pattern }), next);

      // assert
      expect(response.headers.get("x-robots-tag")).toBe("noindex");
    },
  );

  it.each([
    "http://localhost/api/nope",
    "http://localhost/eli-coach-platform/api/nope",
    "http://localhost/wp-login.php",
  ])("answers the unmatched non-page %s with a plain 404", async (url) => {
    // arrange
    const request = argsFor({ pattern: "/*", url });

    // act
    const response = await gate("on").blockUnlessOpen(request, ok());

    // assert
    expect(response?.status).toBe(404);
  });

  it("recognises an open pattern the router reports without its leading slash", async () => {
    // arrange
    const next = ok();

    // act
    await gate("on").blockUnlessOpen(argsFor({ pattern: "readyz" }), next);

    // assert
    expect(next).toHaveBeenCalledTimes(1);
  });

  it.each(["/", "/pricing", "/store/:slug", "/client/*", "*"])(
    "answers the page %s with the placeholder marker at status 200",
    (pattern) => {
      // arrange
      const next = ok();

      // act
      const thrown = thrownBy(() =>
        gate("on").blockUnlessOpen(argsFor({ pattern }), next),
      ) as { data: unknown; init: { status: number } };

      // assert
      expect(thrown.init.status).toBe(200);
      expect(isComingSoonMarker(thrown.data)).toBe(true);
      expect(next).not.toHaveBeenCalled();
    },
  );

  it.each([
    { name: "an API route", pattern: "/api/store/catalog" },
    { name: "the metadata API", pattern: "/api/meta" },
    { name: "a file-like route", pattern: "/client/sw.js" },
    { name: "a manifest", pattern: "/client/manifest.webmanifest" },
  ])("answers $name with a plain 404", async ({ pattern }) => {
    // arrange
    const next = ok();

    // act
    const response = await gate("on").blockUnlessOpen(
      argsFor({ pattern }),
      next,
    );

    // assert
    expect(response?.status).toBe(404);
    expect(await response?.text()).toBe("Not found");
    expect(next).not.toHaveBeenCalled();
  });

  it("answers a single-fetch data request for a page with a plain 404", async () => {
    // arrange
    const request = argsFor({
      pattern: "/pricing",
      url: "http://localhost/eli-coach-platform/pricing.data",
    });

    // act
    const response = await gate("on").blockUnlessOpen(request, ok());

    // assert
    expect(response?.status).toBe(404);
  });

  it.each(["POST", "PUT", "PATCH", "DELETE"])(
    "answers a %s to a page route with a plain 404",
    async (method) => {
      // arrange
      const request = argsFor({ method, pattern: "/" });

      // act
      const response = await gate("on").blockUnlessOpen(request, ok());

      // assert
      expect(response?.status).toBe(404);
    },
  );

  it("treats HEAD as a page request", () => {
    // arrange
    const request = argsFor({ method: "HEAD", pattern: "/" });

    // act
    const thrown = thrownBy(() => gate("on").blockUnlessOpen(request, ok()));

    // assert
    expect(isComingSoonMarker((thrown as { data: unknown }).data)).toBe(true);
  });
});
