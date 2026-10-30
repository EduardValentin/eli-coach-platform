import { PortalBackLink } from "~/shared/design-system/portal";
import {
  isRouteErrorResponse,
  useLoaderData,
  useRouteError,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import {
  clientResourcesContext,
  clientsContext,
} from "~/bounded-contexts/clients/public/request-context";
import { CoachResourceLibrary } from "~/bounded-contexts/clients/client-resources/ui/coach/resources/coach-resource-library";
import { possessive } from "~/bounded-contexts/clients/client-resources/ui/shared/resources/resource-copy";
import { clientFullName } from "~/bounded-contexts/clients/clients/public/clients";
import { coachClientPath } from "~/bounded-contexts/clients/clients/public/paths";
import { ClientNotFound } from "~/surfaces/coach-portal/sections/client-not-found";

const CLIENT_NOT_FOUND_STATUS = 404;

const PAGE_CLASS = "w-full";

const PAGE_PARITY_ROOT = "CoachResourceLibrary";

export async function loader(args: LoaderFunctionArgs) {
  const { clientId } = args.params;

  if (!clientId) {
    throw new Response("Not Found", { status: CLIENT_NOT_FOUND_STATUS });
  }

  const [client, listing] = await Promise.all([
    args.context.get(clientsContext).coachClients.loadClient(args, clientId),
    args.context
      .get(clientResourcesContext)
      .coachResources.load(args, clientId),
  ]);

  return { client, listing };
}

export const meta: MetaFunction<typeof loader> = ({ loaderData }) => [
  {
    title: loaderData
      ? `${possessive(loaderData.client.firstName)} resources | Evoa`
      : "Resources | Evoa",
  },
];

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === CLIENT_NOT_FOUND_STATUS) {
    return <ClientNotFound />;
  }

  throw error;
}

export default function CoachClientResourcesRoute() {
  const { client, listing } = useLoaderData<typeof loader>();

  return (
    <div className={PAGE_CLASS} data-parity-root={PAGE_PARITY_ROOT}>
      <PortalBackLink to={coachClientPath(client.clientId)}>
        Back to {clientFullName(client)}
      </PortalBackLink>

      <CoachResourceLibrary
        clientId={client.clientId}
        firstName={client.firstName}
        listing={listing}
      />
    </div>
  );
}
