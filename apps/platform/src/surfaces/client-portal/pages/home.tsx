import { PortalPageHeader } from "@eli-coach-platform/ui/portal";
import {
  useLoaderData,
  useOutletContext,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import { clientOnboardingContext } from "~/features/client-onboarding/server/guards/client-onboarding-context.server";
import { clientProfileContext } from "~/features/client-profile/server/guards/client-profile-context.server";
import { MeasurementsNudge } from "~/features/client-profile/ui/client/nudge/measurements-nudge";
import { coachingSalesContext } from "~/features/coaching-sales/server/guards/coaching-sales-context.server";
import { ProgramStatusCard } from "~/features/coaching-sales/ui/client/status/program-status-card";
import type { ClientShellPresentation } from "~/surfaces/client-portal/shell/client-identity-presentation";
import { clientPortalPageMeta } from "~/surfaces/client-portal/shell/client-portal-meta";

export async function loader(args: LoaderFunctionArgs) {
  const [programStatus, detailsRequest, { dueLine }] = await Promise.all([
    args.context
      .get(coachingSalesContext)
      .clientJourney.loadProgramStatus(args),
    args.context.get(clientOnboardingContext).controller.loadOpenRequest(args),
    args.context.get(clientProfileContext).clientMeasurements.loadNudge(args),
  ]);

  return { detailsRequest, dueLine, programStatus };
}

export const meta: MetaFunction = () =>
  clientPortalPageMeta("Dashboard | Evoa");

export default function ClientHomeRoute() {
  const { greeting } = useOutletContext<ClientShellPresentation>();
  const { detailsRequest, dueLine, programStatus } =
    useLoaderData<typeof loader>();

  return (
    <div className="w-full" data-parity="dashboard-page">
      <div data-parity-root="ClientGreeting">
        <PortalPageHeader
          subtitle={
            <span data-parity="subtitle">
              Here is your daily snapshot and current focus.
            </span>
          }
          title={<span data-parity="greeting">{greeting}</span>}
        />
      </div>
      {programStatus && (
        <ProgramStatusCard
          detailsRequest={detailsRequest}
          status={programStatus}
        />
      )}
      <MeasurementsNudge dueLine={dueLine} />
    </div>
  );
}
