import { DeadEndPanel } from "@eli-coach-platform/ui/layout";
import { PORTAL_PAGE_TITLE_CLASS } from "@eli-coach-platform/ui/lib";
import { Avatar } from "@eli-coach-platform/ui/primitives";
import { ArrowLeft, UserX } from "lucide-react";
import {
  isRouteErrorResponse,
  Link,
  useLoaderData,
  useRouteError,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import { clientOnboardingContext } from "~/features/client-onboarding/server/guards/client-onboarding-context.server";
import { MeasurementsTable } from "~/features/client-onboarding/ui/coach/onboarding/measurements-table";
import { OnboardingPanel } from "~/features/client-onboarding/ui/coach/onboarding/onboarding-panel";
import { COACH_CLIENTS_PATH } from "~/features/coaching-sales/contracts/paths";
import { coachingSalesContext } from "~/features/coaching-sales/server/guards/coaching-sales-context.server";
import { AssessmentCallBlock } from "~/features/coaching-sales/ui/coach/clients/assessment-call-block";
import { ClientProfileBlock } from "~/features/coaching-sales/ui/coach/clients/client-profile-block";
import { ClientStatusBadge } from "~/features/coaching-sales/ui/coach/clients/client-status-badge";
import { InvitationBlock } from "~/features/coaching-sales/ui/coach/clients/invitation-block";
import { clientFullName } from "~/features/coaching-sales/ui/coach/clients/roster-listing";
import { SubscriptionSummary } from "~/features/coaching-sales/ui/coach/clients/subscription-summary";

const CLIENT_NOT_FOUND_STATUS = 404;

export async function loader(args: LoaderFunctionArgs) {
  const { clientId } = args.params;

  if (!clientId) {
    throw new Response("Not Found", { status: CLIENT_NOT_FOUND_STATUS });
  }

  const [client, review] = await Promise.all([
    args.context
      .get(coachingSalesContext)
      .coachClients.loadClient(args, clientId),
    args.context
      .get(clientOnboardingContext)
      .coachReview.loadReview(args, clientId),
  ]);

  return { client, review };
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
  const { client, review } = useLoaderData<typeof loader>();
  const name = clientFullName(client);

  return (
    <div className="w-full pb-12" data-parity-root="JourneyClientDetails">
      <Link
        className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
        to={COACH_CLIENTS_PATH}
      >
        <ArrowLeft aria-hidden="true" size={16} /> Back to Clients
      </Link>

      <header className="mb-10 flex items-center gap-5">
        <Avatar name={name} size="lg" />
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <h1 className={PORTAL_PAGE_TITLE_CLASS}>{name}</h1>
          </div>
          <p className="text-text-secondary">{client.email}</p>
        </div>
      </header>

      <ClientProfileBlock client={client} />
      <AssessmentCallBlock client={client} />
      {client.invitation && (
        <InvitationBlock
          clientId={client.clientId}
          email={client.email}
          gender={client.profile.gender}
          invitation={client.invitation}
        />
      )}
      <OnboardingPanel
        client={client}
        review={review}
        statusBadge={<ClientStatusBadge status={client.status} />}
      />
      {client.subscription && (
        <SubscriptionSummary
          className="mb-8"
          gender={client.profile.gender}
          subscription={client.subscription}
        />
      )}
      <MeasurementsTable
        gender={client.profile.gender}
        heightCm={review.statedHeightCm}
        measurements={review.measurements}
      />
    </div>
  );
}

function ClientNotFound() {
  return (
    <div className="w-full" data-parity-root="ClientNotFound">
      <DeadEndPanel
        description="This client is not on your roster, or the link is incorrect."
        icon={<UserX aria-hidden="true" size={36} />}
        title="Client not found"
      />
    </div>
  );
}
