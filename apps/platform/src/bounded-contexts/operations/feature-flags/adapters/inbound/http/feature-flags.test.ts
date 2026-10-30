import { describe, expect, it, vi } from "vitest";

import {
  featureFlagsContext,
  type FeatureFlagsFeature,
} from "~/bounded-contexts/operations/feature-flags/adapters/inbound/http/context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/composition-root/test-support/request-args";

import * as featureFlagsRoute from "./feature-flags";

function featureFlagsArgs(feature: FeatureFlagsFeature, request?: Request) {
  return createRequestArgs({
    contexts: [contextEntry(featureFlagsContext, feature)],
    request,
  });
}

describe("feature flags route", () => {
  it("answers feature flags from the feature flags context", async () => {
    // arrange
    const response = Response.json({ values: { CLIENT_PORTAL: true } });
    const getSnapshot = vi.fn().mockResolvedValue(response);

    // act
    const loaded = featureFlagsRoute.loader(
      featureFlagsArgs({ featureFlagController: { getSnapshot } as never }),
    );

    // assert
    await expect(loaded).resolves.toBe(response);
    expect(getSnapshot).toHaveBeenCalledTimes(1);
  });

  it("rejects a feature flag write without reading the feature flags context", async () => {
    // arrange
    const getSnapshot = vi.fn();
    const args = featureFlagsArgs(
      { featureFlagController: { getSnapshot } as never },
      new Request("https://eli.example/api/feature-flags", { method: "POST" }),
    );

    // act
    const response = await featureFlagsRoute.action(args);

    // assert
    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("GET");
    expect(getSnapshot).not.toHaveBeenCalled();
  });
});
