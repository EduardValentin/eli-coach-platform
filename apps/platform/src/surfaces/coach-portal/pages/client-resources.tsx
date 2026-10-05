import { ArrowLeft } from "lucide-react";
import {
  isRouteErrorResponse,
  Link,
  useLoaderData,
  useRevalidator,
  useRouteError,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import { CoachResourceLibrary } from "~/features/client-resources/ui/coach/resources/coach-resource-library";
import { possessive } from "~/features/client-resources/ui/shared/resources/resource-copy";
import { ResourcesUnavailable } from "~/features/client-resources/ui/shared/resources/resources-unavailable";
import { clientResourcesContext } from "~/features/client-resources/server/guards/client-resources-context.server";
import { coachClientPath } from "~/features/coaching-sales/contracts/paths";
import { coachingSalesContext } from "~/features/coaching-sales/server/guards/coaching-sales-context.server";
import { clientFullName } from "~/features/coaching-sales/ui/coach/clients/roster-listing";
import { ClientNotFound } from "~/surfaces/coach-portal/sections/client-not-found";

const CLIENT_NOT_FOUND_STATUS = 404;

const PAGE_CLASS = "w-full";

const PAGE_PARITY_ROOT = "CoachResourceLibrary";

export async function loader(args: LoaderFunctionArgs) {
  const { clientId } = args.params;

  if (!clientId) {
    throw new Response("Not Found", { status: CLIENT_NOT_FOUND_STATUS });
  }

  const [client, resources] = await Promise.all([
    args.context
      .get(coachingSalesContext)
      .coachClients.loadClient(args, clientId),
    args.context
      .get(clientResourcesContext)
      .coachResources.load(args, clientId),
  ]);

  return { client, resources };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  {
    title: data
      ? `${possessive(data.client.firstName)} resources | Evoa`
      : "Resources | Evoa",
  },
];

export function ErrorBoundary() {
  const error = useRouteError();
  const revalidator = useRevalidator();

  if (isRouteErrorResponse(error) && error.status === CLIENT_NOT_FOUND_STATUS) {
    return <ClientNotFound />;
  }

  return (
    <div className={PAGE_CLASS} data-parity-root={PAGE_PARITY_ROOT}>
      <ResourcesUnavailable onRetry={() => void revalidator.revalidate()} />
    </div>
  );
}

export default function CoachClientResourcesRoute() {
  const { client, resources } = useLoaderData<typeof loader>();

  return (
    <div className={PAGE_CLASS} data-parity-root={PAGE_PARITY_ROOT}>
      <Link
        className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
        to={coachClientPath(client.clientId)}
      >
        <ArrowLeft aria-hidden="true" size={16} /> Back to{" "}
        {clientFullName(client)}
      </Link>

      <CoachResourceLibrary
        clientId={client.clientId}
        firstName={client.firstName}
        resources={resources}
      />
    </div>
  );
}
