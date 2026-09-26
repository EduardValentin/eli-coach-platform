import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { accountsContext } from "~/features/accounts/server/guards/accounts-context.server";
import { assessmentCallsContext } from "~/features/assessment-calls/server/guards/assessment-calls-context.server";
import { coachingSalesContext } from "~/features/coaching-sales/server/guards/coaching-sales-context.server";
import { storeContext } from "~/features/store/server/guards/store-context.server";
import { waitlistContext } from "~/features/waitlist/server/guards/waitlist-context.server";
import type { PlatformContainer } from "~/server/container.server";
import { createFeatureContextMiddleware } from "~/server/feature-contexts.server";
import { platformContext } from "~/server/guards/platform-context.server";
import { runtimeConfigContext } from "~/server/guards/runtime-config-context.server";

describe("createFeatureContextMiddleware", () => {
  it("publishes every feature slice of the container on the request context and continues", async () => {
    // arrange
    const container = {
      accounts: { kind: "accounts" },
      assessmentCalls: {
        feature: { kind: "assessment-calls" },
        handles: { kind: "assessment-calls-handles" },
      },
      coachingSales: {
        feature: { kind: "coaching-sales" },
        handles: {},
      },
      platform: {
        appBasePath: "/",
        botDetection: { provider: "static", token: "t" },
        featureFlags: { kind: "flags" },
        metadata: { kind: "meta" },
        readyz: { kind: "readyz" },
      },
      store: { kind: "store" },
      waitlist: {
        feature: { kind: "waitlist" },
        handles: { kind: "waitlist-handles" },
      },
    } as unknown as PlatformContainer;
    const getContainer = vi.fn(() => container);
    const context = new RouterContextProvider();
    const next = vi.fn().mockResolvedValue(new Response("ok"));

    // act
    const response = await createFeatureContextMiddleware(getContainer)(
      {
        context,
        request: new Request("http://localhost/"),
        params: {},
      } as never,
      next,
    );

    // assert
    expect(getContainer).toHaveBeenCalledTimes(1);
    expect(context.get(accountsContext)).toBe(container.accounts);
    expect(context.get(assessmentCallsContext)).toBe(
      container.assessmentCalls.feature,
    );
    expect(context.get(coachingSalesContext)).toBe(
      container.coachingSales.feature,
    );
    expect(context.get(platformContext)).toEqual({
      featureFlags: container.platform.featureFlags,
      metadata: container.platform.metadata,
      readyz: container.platform.readyz,
    });
    expect(context.get(runtimeConfigContext)).toEqual({
      appBasePath: container.platform.appBasePath,
      botDetection: container.platform.botDetection,
    });
    expect(context.get(storeContext)).toBe(container.store);
    expect(context.get(waitlistContext)).toBe(container.waitlist.feature);
    expect(response).toBeInstanceOf(Response);
  });
});
