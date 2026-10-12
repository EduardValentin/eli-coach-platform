import { PortalBackLink } from "@eli-coach-platform/ui/portal";
import {
  isRouteErrorResponse,
  useLoaderData,
  useRouteError,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import { clientResourcesContext } from "~/features/client-resources/server/guards/client-resources-context.server";
import { CoachResourceLibrary } from "~/features/client-resources/ui/coach/resources/coach-resource-library";
import { possessive } from "~/features/client-resources/ui/shared/resources/resource-copy";
import { clientFullName } from "~/features/clients/public/clients";
import { coachClientPath } from "~/features/clients/public/paths";
import { clientsContext } from "~/features/clients/server/guards/clients-context.server";
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

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  {
    title: data
      ? `${possessive(data.client.firstName)} resources | Evoa`
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
