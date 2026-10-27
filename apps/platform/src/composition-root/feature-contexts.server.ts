import type { MiddlewareFunction } from "react-router";

import { accountsContext } from "~/bounded-contexts/access/accounts/server/guards/accounts-context.server";
import { assessmentCallsContext } from "~/bounded-contexts/scheduling/assessment-calls/server/guards/assessment-calls-context.server";
import { checkInsContext } from "~/bounded-contexts/clients/check-ins/server/guards/check-ins-context.server";
import { clientOnboardingContext } from "~/bounded-contexts/clients/client-profile/server/guards/client-onboarding-context.server";
import { clientProfileContext } from "~/bounded-contexts/clients/client-profile/server/guards/client-profile-context.server";
import { clientResourcesContext } from "~/bounded-contexts/clients/client-resources/server/guards/client-resources-context.server";
import { clientsContext } from "~/bounded-contexts/clients/clients/server/guards/clients-context.server";
import { coachScheduleContext } from "~/bounded-contexts/scheduling/coach-schedule/server/guards/coach-schedule-context.server";
import { coachingSalesContext } from "~/bounded-contexts/sales/coaching-sales/server/guards/coaching-sales-context.server";
import { exerciseLibraryContext } from "~/bounded-contexts/programs/exercise-library/server/guards/exercise-library-context.server";
import { notificationsContext } from "~/bounded-contexts/clients/notifications/server/guards/notifications-context.server";
import { nutritionLibraryContext } from "~/bounded-contexts/programs/nutrition-library/server/guards/nutrition-library-context.server";
import { storeContext } from "~/bounded-contexts/sales/store/server/guards/store-context.server";
import { waitlistContext } from "~/bounded-contexts/sales/waitlist/server/guards/waitlist-context.server";
import type { PlatformContainer } from "~/composition-root/container.server";
import { platformContext } from "~/composition-root/guards/platform-context.server";
import { runtimeConfigContext } from "~/composition-root/guards/runtime-config-context.server";

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
    context.set(clientsContext, container.clients.feature);
    context.set(coachScheduleContext, container.coachSchedule.feature);
    context.set(coachingSalesContext, container.coachingSales.feature);
    context.set(notificationsContext, container.notifications);
    context.set(exerciseLibraryContext, container.exerciseLibrary);
    context.set(nutritionLibraryContext, container.nutritionLibrary);
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
    context.set(waitlistContext, container.waitlist.feature);

    return next();
  };
}
