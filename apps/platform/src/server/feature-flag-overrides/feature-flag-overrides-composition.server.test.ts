import { describe, expect, it, vi } from "vitest";

import type { FeatureFlagReader } from "@eli-coach-platform/domain/feature-flag";
import {
  composeBrowserFeatureFlagOverrides,
  composeWithoutFeatureFlagOverrides,
} from "~/server/feature-flag-overrides/feature-flag-overrides-composition.server";
import { createRequestArgs } from "~/server/test-support/request-args";

const request = new Request("https://eli.example/?ff.WAITLIST_MODE=false");

describe("feature flag overrides composition", () => {
  it("lets a browser override the database flags", async () => {
    // arrange
    const databaseReader: FeatureFlagReader = {
      execute: vi.fn().mockResolvedValue({ WAITLIST_MODE: true }),
    };
    const overrides = composeBrowserFeatureFlagOverrides({
      appBasePath: "/",
      featureFlags: databaseReader,
    });
    const flagsSeenByApplication = vi.fn();

    // act
    const response = await overrides.middleware(
      createRequestArgs({ request }),
      async () => {
        flagsSeenByApplication(await overrides.featureFlags.execute());

        return new Response("ok");
      },
    );

    // assert
    expect(flagsSeenByApplication).toHaveBeenCalledWith({
      WAITLIST_MODE: false,
    });
    expect(response?.headers.get("Set-Cookie")).toContain(
      "__eli_feature_flags=",
    );
  });

  it("ignores override input when overrides are off", async () => {
    // arrange
    const databaseReader: FeatureFlagReader = {
      execute: vi.fn().mockResolvedValue({ WAITLIST_MODE: true }),
    };
    const overrides = composeWithoutFeatureFlagOverrides(databaseReader);
    const applicationResponse = new Response("ok");
    const flagsSeenByApplication = vi.fn();

    // act
    const response = await overrides.middleware(
      createRequestArgs({ request }),
      async () => {
        flagsSeenByApplication(await overrides.featureFlags.execute());

        return applicationResponse;
      },
    );

    // assert
    expect(flagsSeenByApplication).toHaveBeenCalledWith({
      WAITLIST_MODE: true,
    });
    expect(response).toBe(applicationResponse);
    expect(applicationResponse.headers.get("Set-Cookie")).toBeNull();
  });
});
