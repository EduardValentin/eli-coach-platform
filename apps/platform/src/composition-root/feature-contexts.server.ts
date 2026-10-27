import type { MiddlewareFunction } from "react-router";

import { accountsContext } from "~/bounded-contexts/access/accounts/adapters/inbound/http/context.server";
import { assessmentCallsContext } from "~/bounded-contexts/scheduling/assessment-calls/adapters/inbound/http/context.server";
import { checkInsContext } from "~/bounded-contexts/clients/check-ins/adapters/inbound/http/context.server";
import {
  clientOnboardingContext,
  clientProfileContext,
} from "~/bounded-contexts/clients/client-profile/adapters/inbound/http/context.server";
import { clientResourcesContext } from "~/bounded-contexts/clients/client-resources/adapters/inbound/http/context.server";
import { clientsContext } from "~/bounded-contexts/clients/clients/adapters/inbound/http/context.server";
import { coachScheduleContext } from "~/bounded-contexts/scheduling/coach-schedule/adapters/inbound/http/context.server";
import { coachingSalesContext } from "~/bounded-contexts/sales/coaching-sales/adapters/inbound/http/context.server";
import { featureFlagsContext } from "~/bounded-contexts/operations/feature-flags/adapters/inbound/http/context.server";
import { exerciseLibraryContext } from "~/bounded-contexts/programs/exercise-library/adapters/inbound/http/context.server";
import { notificationsContext } from "~/bounded-contexts/clients/notifications/adapters/inbound/http/context.server";
import { nutritionLibraryContext } from "~/bounded-contexts/programs/nutrition-library/adapters/inbound/http/context.server";
import { storeContext } from "~/bounded-contexts/sales/store/adapters/inbound/http/context.server";
import { waitlistContext } from "~/bounded-contexts/sales/waitlist/adapters/inbound/http/context.server";
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
    context.set(featureFlagsContext, container.featureFlags.feature);
    context.set(platformContext, {
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
