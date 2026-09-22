import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { assessmentCallsFeatureFlagEvaluationContext } from "~/features/assessment-calls/server/guards/assessment-calls-context.server";
import { waitlistFeatureFlagEvaluationContext } from "~/features/waitlist/server/guards/waitlist-context.server";
import { createFeatureFlagOverrideMiddleware } from "~/server/non-production/feature-flag-overrides-http.server";
import { platformFeatureFlagEvaluationContext } from "~/server/guards/platform-context.server";

describe("feature flag override middleware", () => {
  it("applies an override immediately and stores it for the browser session", async () => {
    // arrange
    const context = new RouterContextProvider();
    const next = vi.fn().mockResolvedValue(new Response("ok"));
    const middleware = createFeatureFlagOverrideMiddleware({
      appBasePath: "/eli-coach-platform",
    });

    // act
    const response = requireResponse(
      await middleware(
        {
          context,
          params: {},
          request: new Request(
            "https://eli.example/eli-coach-platform/?ff.WAITLIST_MODE=false",
          ),
        } as never,
        next,
      ),
    );

    // assert
    expect(context.get(platformFeatureFlagEvaluationContext)).toEqual({
      overrides: { WAITLIST_MODE: false },
    });
    expect(context.get(waitlistFeatureFlagEvaluationContext)).toEqual({
      overrides: { WAITLIST_MODE: false },
    });
    expect(context.get(assessmentCallsFeatureFlagEvaluationContext)).toEqual({
      overrides: { WAITLIST_MODE: false },
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
        {
          context: new RouterContextProvider(),
          params: {},
          request: new Request(
            "https://eli.example/eli-coach-platform/?ff.WAITLIST_MODE=false",
          ),
        } as never,
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
    const firstContext = new RouterContextProvider();
    const middleware = createFeatureFlagOverrideMiddleware({
      appBasePath: "/",
    });
    const firstResponse = requireResponse(
      await middleware(
        {
          context: firstContext,
          params: {},
          request: new Request("http://localhost:3000/?ff.WAITLIST_MODE=true"),
        } as never,
        () => Promise.resolve(new Response("ok")),
      ),
    );
    const cookie = firstResponse.headers.get("Set-Cookie")?.split(";", 1)[0];
    const context = new RouterContextProvider();

    // act
    const response = requireResponse(
      await middleware(
        {
          context,
          params: {},
          request: new Request("http://localhost:3000/pricing", {
            headers: { Cookie: cookie ?? "" },
          }),
        } as never,
        () => Promise.resolve(new Response("ok")),
      ),
    );

    // assert
    expect(context.get(platformFeatureFlagEvaluationContext)).toEqual({
      overrides: { WAITLIST_MODE: true },
    });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("ignores a malformed session cookie", async () => {
    // arrange
    const context = new RouterContextProvider();
    const middleware = createFeatureFlagOverrideMiddleware({
      appBasePath: "/",
    });

    // act
    await middleware(
      {
        context,
        params: {},
        request: new Request("http://localhost:3000/", {
          headers: { Cookie: "__eli_feature_flags=%not-json" },
        }),
      } as never,
      () => Promise.resolve(new Response("ok")),
    );

    // assert
    expect(context.get(platformFeatureFlagEvaluationContext)).toEqual({
      overrides: {},
    });
  });

  it("returns to the database value when the override is defaulted", async () => {
    // arrange
    const context = new RouterContextProvider();
    const middleware = createFeatureFlagOverrideMiddleware({
      appBasePath: "/",
    });

    // act
    const response = requireResponse(
      await middleware(
        {
          context,
          params: {},
          request: new Request(
            "http://localhost:3000/?ff.WAITLIST_MODE=default",
            {
              headers: {
                Cookie: "__eli_feature_flags=%7B%22WAITLIST_MODE%22%3Atrue%7D",
              },
            },
          ),
        } as never,
        () => Promise.resolve(new Response("ok")),
      ),
    );

    // assert
    expect(context.get(platformFeatureFlagEvaluationContext)).toEqual({
      overrides: {},
    });
    expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
  });

  it("rejects an unknown override without running the application", async () => {
    // arrange
    const context = new RouterContextProvider();
    const next = vi.fn().mockResolvedValue(new Response("ok"));
    const middleware = createFeatureFlagOverrideMiddleware({
      appBasePath: "/",
    });

    // act
    const response = requireResponse(
      await middleware(
        {
          context,
          params: {},
          request: new Request("http://localhost:3000/?ff.UNKNOWN=true"),
        } as never,
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
    const context = new RouterContextProvider();
    const next = vi.fn().mockResolvedValue(new Response("ok"));
    const middleware = createFeatureFlagOverrideMiddleware({
      appBasePath: "/",
    });

    // act
    const response = requireResponse(
      await middleware(
        {
          context,
          params: {},
          request: new Request(
            "http://localhost:3000/?ff.WAITLIST_MODE=enabled",
          ),
        } as never,
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

function requireResponse(response: Response | void): Response {
  if (!response) {
    throw new Error("Expected middleware to return a response.");
  }

  return response;
}
