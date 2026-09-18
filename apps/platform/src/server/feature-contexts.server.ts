import type { MiddlewareFunction } from "react-router";

import { accountsContext } from "~/features/accounts/server/guards/accounts-context.server";
import { assessmentCallsContext } from "~/features/assessment-calls/server/guards/assessment-calls-context.server";
import { storeContext } from "~/features/store/server/guards/store-context.server";
import { waitlistContext } from "~/features/waitlist/server/guards/waitlist-context.server";
import type { PlatformContainer } from "~/server/container.server";
import { platformContext } from "~/server/guards/platform-context.server";
import { runtimeConfigContext } from "~/server/guards/runtime-config-context.server";

export function createFeatureContextMiddleware(
  getContainer: () => PlatformContainer,
): MiddlewareFunction<Response> {
  return async function provideFeatureContexts({ context }, next) {
    const container = getContainer();

    context.set(accountsContext, container.accounts);
    context.set(assessmentCallsContext, container.assessmentCalls);
    context.set(platformContext, {
      featureFlags: container.platform.featureFlags,
      metadata: container.platform.metadata,
      readyz: container.platform.readyz,
    });
    context.set(runtimeConfigContext, {
      appBasePath: container.platform.appBasePath,
      botDetection: container.platform.botDetection,
    });
    context.set(storeContext, container.store);
    context.set(waitlistContext, container.waitlist);

    return next();
  };
}
