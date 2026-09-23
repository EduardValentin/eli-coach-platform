import { describe, expect, it, vi } from "vitest";

import { createFeatureFlagOverrideReader } from "~/server/feature-flag-overrides/feature-flag-override-reader.server";
import { createFeatureFlagOverrideMiddleware } from "~/server/feature-flag-overrides/feature-flag-overrides-http.server";
import { createRequestArgs } from "~/server/test-support/request-args";

describe("feature flag override middleware", () => {
  it("applies an override immediately and stores it for the browser session", async () => {
    // arrange
    const { flagsSeenByApplication, next } = recordFlagsSeenByApplication();
    const middleware = createFeatureFlagOverrideMiddleware({
      appBasePath: "/eli-coach-platform",
    });

    // act
    const response = requireResponse(
      await middleware(
        createRequestArgs({
          request: new Request(
            "https://eli.example/eli-coach-platform/?ff.WAITLIST_MODE=false",
          ),
        }),
        next,
      ),
    );

    // assert
    expect(flagsSeenByApplication).toHaveBeenCalledWith({
      WAITLIST_MODE: false,
    });
    expect(response.headers.get("Set-Cookie")).toContain(
      "Path=/eli-coach-platform",
    );
    expect(response.headers.get("Set-Cookie")).toContain("HttpOnly");
    expect(response.headers.get("Set-Cookie")).toContain("SameSite=Lax");
    expect(response.headers.get("Set-Cookie")).not.toContain("Expires=");
    expect(response.headers.get("Set-Cookie")).not.toContain("Max-Age=");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("scopes the cookie to the normalized app base path", async () => {
    // arrange
    const middleware = createFeatureFlagOverrideMiddleware({
      appBasePath: "/eli-coach-platform/",
    });

    // act
    const response = requireResponse(
      await middleware(
        createRequestArgs({
          request: new Request(
            "https://eli.example/eli-coach-platform/?ff.WAITLIST_MODE=false",
          ),
        }),
        () => Promise.resolve(new Response("ok")),
      ),
    );

    // assert
    expect(response.headers.get("Set-Cookie")).toContain(
      "Path=/eli-coach-platform;",
    );
  });

  it("restores a session override when the URL has no override", async () => {
    // arrange
    const middleware = createFeatureFlagOverrideMiddleware({
      appBasePath: "/",
    });
    const overrideResponse = requireResponse(
      await middleware(
        createRequestArgs({
          request: new Request("http://localhost:3000/?ff.WAITLIST_MODE=false"),
        }),
        () => Promise.resolve(new Response("ok")),
      ),
    );
    const { flagsSeenByApplication, next } = recordFlagsSeenByApplication();

    // act
    const response = requireResponse(
      await middleware(
        createRequestArgs({
          request: new Request("http://localhost:3000/pricing", {
            headers: { Cookie: requireSessionCookie(overrideResponse) },
          }),
        }),
        next,
      ),
    );

    // assert
    expect(flagsSeenByApplication).toHaveBeenCalledWith({
      WAITLIST_MODE: false,
    });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("ignores a malformed session cookie", async () => {
    // arrange
    const { flagsSeenByApplication, next } = recordFlagsSeenByApplication();
    const middleware = createFeatureFlagOverrideMiddleware({
      appBasePath: "/",
    });

    // act
    await middleware(
      createRequestArgs({
        request: new Request("http://localhost:3000/", {
          headers: { Cookie: "__eli_feature_flags=%not-json" },
        }),
      }),
      next,
    );

    // assert
    expect(flagsSeenByApplication).toHaveBeenCalledWith({
      WAITLIST_MODE: true,
    });
  });

  it("returns to the database value when the override is defaulted", async () => {
    // arrange
    const { flagsSeenByApplication, next } = recordFlagsSeenByApplication();
    const middleware = createFeatureFlagOverrideMiddleware({
      appBasePath: "/",
    });

    // act
    const response = requireResponse(
      await middleware(
        createRequestArgs({
          request: new Request(
            "http://localhost:3000/?ff.WAITLIST_MODE=default",
            {
              headers: {
                Cookie: "__eli_feature_flags=%7B%22WAITLIST_MODE%22%3Afalse%7D",
              },
            },
          ),
        }),
        next,
      ),
    );

    // assert
    expect(flagsSeenByApplication).toHaveBeenCalledWith({
      WAITLIST_MODE: true,
    });
    expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
  });

  it("rejects an unknown override without running the application", async () => {
    // arrange
    const next = vi.fn().mockResolvedValue(new Response("ok"));
    const middleware = createFeatureFlagOverrideMiddleware({
      appBasePath: "/",
    });

    // act
    const response = requireResponse(
      await middleware(
        createRequestArgs({
          request: new Request("http://localhost:3000/?ff.UNKNOWN=true"),
        }),
        next,
      ),
    );

    // assert
    expect(response.status).toBe(400);
    expect(await response.text()).toContain("Unknown feature flag");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects an invalid override value", async () => {
    // arrange
    const next = vi.fn().mockResolvedValue(new Response("ok"));
    const middleware = createFeatureFlagOverrideMiddleware({
      appBasePath: "/",
    });

    // act
    const response = requireResponse(
      await middleware(
        createRequestArgs({
          request: new Request(
            "http://localhost:3000/?ff.WAITLIST_MODE=enabled",
          ),
        }),
        next,
      ),
    );

    // assert
    expect(response.status).toBe(400);
    expect(await response.text()).toContain("Invalid feature flag override");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(next).not.toHaveBeenCalled();
  });
});

function recordFlagsSeenByApplication() {
  const featureFlags = createFeatureFlagOverrideReader({
    execute: async () => ({ WAITLIST_MODE: true }),
  });
  const flagsSeenByApplication = vi.fn();
  const next = vi.fn(async () => {
    flagsSeenByApplication(await featureFlags.execute());

    return new Response("ok");
  });

  return { flagsSeenByApplication, next };
}

function requireSessionCookie(response: Response): string {
  const cookie = response.headers.get("Set-Cookie")?.split(";", 1)[0];

  if (!cookie) {
    throw new Error("Expected the response to set the override cookie.");
  }

  return cookie;
}

function requireResponse(response: Response | void): Response {
  if (!response) {
    throw new Error("Expected middleware to return a response.");
  }

  return response;
}
