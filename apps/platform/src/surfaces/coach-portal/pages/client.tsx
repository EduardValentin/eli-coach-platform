import { PORTAL_PAGE_TITLE_CLASS } from "@eli-coach-platform/ui/lib";
import { PortalBackLink } from "@eli-coach-platform/ui/portal";
import { Avatar, buttonVariants } from "@eli-coach-platform/ui/primitives";
import { FolderOpen } from "lucide-react";
import { useState } from "react";
import {
  isRouteErrorResponse,
  Link,
  useLoaderData,
  useRouteError,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import { clientOnboardingContext } from "~/features/client-onboarding/server/guards/client-onboarding-context.server";
import { OnboardingPanel } from "~/features/client-onboarding/ui/coach/onboarding/onboarding-panel";
import { MEASUREMENTS_COPY } from "~/features/client-profile/contracts/measurements";
import { clientProfileContext } from "~/features/client-profile/server/guards/client-profile-context.server";
import { ClientProfileBlock } from "~/features/client-profile/ui/coach/profile/client-profile-block";
import { MeasurementsTable } from "~/features/client-profile/ui/shared/measurements/measurements-table";
import { PhotoViewDialog } from "~/features/client-profile/ui/shared/photos/photo-view-dialog";
import { COACH_CLIENTS_PATH } from "~/features/coaching-sales/contracts/paths";
import { coachingSalesContext } from "~/features/coaching-sales/server/guards/coaching-sales-context.server";
import { AssessmentCallBlock } from "~/features/coaching-sales/ui/coach/clients/assessment-call-block";
import { ClientStatusBadge } from "~/features/coaching-sales/ui/coach/clients/client-status-badge";
import { InvitationBlock } from "~/features/coaching-sales/ui/coach/clients/invitation-block";
import { NeedsRefundBadge } from "~/features/coaching-sales/ui/coach/clients/needs-refund-badge";
import { clientFullName } from "~/features/coaching-sales/ui/coach/clients/roster-listing";
import { SubscriptionSummary } from "~/features/coaching-sales/ui/coach/clients/subscription-summary";
import { coachClientResourcesPath } from "~/features/client-resources/contracts/paths";
import { ClientNotFound } from "~/surfaces/coach-portal/sections/client-not-found";

const CLIENT_NOT_FOUND_STATUS = 404;

export async function loader(args: LoaderFunctionArgs) {
  const { clientId } = args.params;

  if (!clientId) {
    throw new Response("Not Found", { status: CLIENT_NOT_FOUND_STATUS });
  }

  const { coachProfile } = args.context.get(clientProfileContext);
  const [client, review, profile, measurements] = await Promise.all([
    args.context
      .get(coachingSalesContext)
      .coachClients.loadClient(args, clientId),
    args.context
      .get(clientOnboardingContext)
      .coachReview.loadReview(args, clientId),
    coachProfile.load(args, clientId),
    coachProfile.loadMeasurements(args, clientId),
  ]);

  return { client, review, profile, measurements };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: data ? `${clientFullName(data.client)} | Evoa` : "Clients | Evoa" },
];

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === CLIENT_NOT_FOUND_STATUS) {
    return <ClientNotFound />;
  }

  throw error;
}

export default function CoachClientRoute() {
  const { client, review, profile, measurements } =
    useLoaderData<typeof loader>();
  const name = clientFullName(client);
  const [viewingEntryId, setViewingEntryId] = useState<string | null>(null);
  const viewedEntry = measurements.find((entry) => entry.id === viewingEntryId);

  return (
    <div className="w-full pb-12" data-parity-root="JourneyClientDetails">
      <PortalBackLink to={COACH_CLIENTS_PATH}>Back to Clients</PortalBackLink>

      <header className="mb-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-5">
          <Avatar name={name} size="lg" />
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <h1 className={PORTAL_PAGE_TITLE_CLASS}>{name}</h1>
              {client.needsRefund && <NeedsRefundBadge parity="needs-refund" />}
            </div>
            <p className="text-text-secondary">{client.email}</p>
          </div>
        </div>
        <div
          className="flex flex-wrap items-center gap-3 md:shrink-0"
          data-parity="client-header-actions"
        >
          <Link
            className={buttonVariants({ size: "md", variant: "outline" })}
            to={coachClientResourcesPath(client.clientId)}
          >
            <FolderOpen aria-hidden="true" size={16} />
            Resources
          </Link>
        </div>
      </header>

      <ClientProfileBlock profile={profile} />
      {client.invitation && (
        <InvitationBlock client={client} invitation={client.invitation} />
      )}
      <OnboardingPanel
        client={client}
        review={review}
        statusBadge={<ClientStatusBadge status={client.status} />}
      />
      {client.subscription && (
        <SubscriptionSummary
          className="mb-8"
          gender={client.gender}
          subscription={client.subscription}
        />
      )}
      <MeasurementsTable
        className="mb-8"
        emptyMessage={MEASUREMENTS_COPY.empty(client.gender)}
        headingId="measurements-panel-heading"
        heightCm={profile.facts?.heightCm ?? null}
        measurements={measurements}
        onViewPhotos={(entry) => setViewingEntryId(entry.id)}
        perspective="coach"
        ratioHidden={review.submitted?.pregnancyContext ?? false}
      >
        <PhotoViewDialog
          onClose={() => setViewingEntryId(null)}
          entry={viewedEntry}
          viewer={{ role: "coach", clientFirstName: client.firstName }}
        />
      </MeasurementsTable>
      <AssessmentCallBlock client={client} />
    </div>
  );
}
