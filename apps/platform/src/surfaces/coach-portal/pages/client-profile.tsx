import {
  isRouteErrorResponse,
  useLoaderData,
  useRouteError,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import { clientProfileContext } from "~/features/client-profile/server/guards/client-profile-context.server";
import { CoachClientProfile } from "~/features/client-profile/ui/coach/profile/coach-client-profile";
import { clientFullName } from "~/features/clients/public/clients";
import { clientsContext } from "~/features/clients/server/guards/clients-context.server";
import { ClientNotFound } from "~/surfaces/coach-portal/sections/client-not-found";

const CLIENT_NOT_FOUND_STATUS = 404;

export async function loader(args: LoaderFunctionArgs) {
  const { clientId } = args.params;

  if (!clientId) {
    throw new Response("Not Found", { status: CLIENT_NOT_FOUND_STATUS });
  }

  const [client, profile] = await Promise.all([
    args.context.get(clientsContext).coachClients.loadClient(args, clientId),
    args.context.get(clientProfileContext).coachProfile.load(args, clientId),
  ]);

  return { clientId: client.clientId, profile };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  {
    title: data
      ? `${clientFullName(data.profile.identity)} profile | Evoa`
      : "Profile | Evoa",
  },
];

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === CLIENT_NOT_FOUND_STATUS) {
    return <ClientNotFound />;
  }

  throw error;
}

export default function CoachClientProfileRoute() {
  const { clientId, profile } = useLoaderData<typeof loader>();

  return <CoachClientProfile clientId={clientId} profile={profile} />;
}
