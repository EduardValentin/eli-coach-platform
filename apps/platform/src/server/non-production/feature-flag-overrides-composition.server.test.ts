import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";

import {
  createRuntimeFeatureFlagOverrideMiddleware,
  featureFlagOverridesAllowed,
} from "~/server/non-production/feature-flag-overrides-composition.server";

describe("feature flag override composition", () => {
  it.each(["local", "test"])("allows overrides in %s", (environment) => {
    // arrange
    // act
    const allowed = featureFlagOverridesAllowed(environment);

    // assert
    expect(allowed).toBe(true);
  });

  it.each(["production", "preview", ""])(
    "denies overrides in %s",
    (environment) => {
      // arrange
      // act
      const allowed = featureFlagOverridesAllowed(environment);

      // assert
      expect(allowed).toBe(false);
    },
  );

  it("does not parse override input in production", async () => {
    // arrange
    const applicationResponse = new Response("ok");
    const next = vi.fn().mockResolvedValue(applicationResponse);
    const middleware = createRuntimeFeatureFlagOverrideMiddleware({
      environment: () => ({ APP_BASE_PATH: "/", ENVIRONMENT: "production" }),
    });

    // act
    const response = await middleware(
      {
        context: new RouterContextProvider(),
        params: {},
        request: new Request("https://eli.example/?ff.UNKNOWN=true"),
      } as never,
      next,
    );

    // assert
    expect(response).toBe(applicationResponse);
    expect(applicationResponse.headers.get("Set-Cookie")).toBeNull();
    expect(next).toHaveBeenCalledOnce();
  });
});
