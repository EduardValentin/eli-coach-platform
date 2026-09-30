import { PortalPageHeader } from "@eli-coach-platform/ui/portal";
import {
  useLoaderData,
  useOutletContext,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import type { ProgramStatus } from "~/features/coaching-sales/contracts/client-journey";
import { coachingSalesContext } from "~/features/coaching-sales/server/guards/coaching-sales-context.server";
import { ProgramStatusCard } from "~/features/coaching-sales/ui/client/status/program-status-card";
import type { ClientShellPresentation } from "~/surfaces/client-portal/shell/client-identity-presentation";
import { clientPortalPageMeta } from "~/surfaces/client-portal/shell/client-portal-meta";

export function loader(
  args: LoaderFunctionArgs,
): Promise<ProgramStatus | null> {
  return args.context
    .get(coachingSalesContext)
    .clientJourney.loadProgramStatus(args);
}

export const meta: MetaFunction = () =>
  clientPortalPageMeta("Dashboard | Evoa");

export default function ClientHomeRoute() {
  const { greeting } = useOutletContext<ClientShellPresentation>();
  const programStatus = useLoaderData<typeof loader>();

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
      {programStatus && <ProgramStatusCard status={programStatus} />}
    </div>
  );
}
