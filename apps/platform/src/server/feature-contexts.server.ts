import type { MiddlewareFunction } from "react-router";

import { accountsContext } from "~/features/accounts/server/guards/accounts-context.server";
import { assessmentCallsContext } from "~/features/assessment-calls/server/guards/assessment-calls-context.server";
import { checkInsContext } from "~/features/check-ins/server/guards/check-ins-context.server";
import { clientOnboardingContext } from "~/features/client-onboarding/server/guards/client-onboarding-context.server";
import { clientProfileContext } from "~/features/client-profile/server/guards/client-profile-context.server";
import { clientResourcesContext } from "~/features/client-resources/server/guards/client-resources-context.server";
import { coachScheduleContext } from "~/features/coach-schedule/server/guards/coach-schedule-context.server";
import { coachingSalesContext } from "~/features/coaching-sales/server/guards/coaching-sales-context.server";
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
    context.set(assessmentCallsContext, container.assessmentCalls.feature);
    context.set(checkInsContext, container.checkIns);
    context.set(clientOnboardingContext, container.clientOnboarding);
    context.set(clientProfileContext, container.clientProfile.feature);
    context.set(clientResourcesContext, container.clientResources);
    context.set(coachScheduleContext, container.coachSchedule.feature);
    context.set(coachingSalesContext, container.coachingSales.feature);
    context.set(platformContext, {
      featureFlags: container.platform.featureFlags,
      metadata: container.platform.metadata,
      readyz: container.platform.readyz,
      stripeWebhooks: container.platform.stripeWebhooks,
    });
    context.set(runtimeConfigContext, {
      appBasePath: container.platform.appBasePath,
      botDetection: container.platform.botDetection,
    });
    context.set(storeContext, container.store);
    context.set(waitlistContext, container.waitlist.feature);

    return next();
  };
}
