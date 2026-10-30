import {
  isRouteErrorResponse,
  useLoaderData,
  useRouteError,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import {
  clientProfileContext,
  clientsContext,
} from "~/bounded-contexts/clients/public/request-context";
import { CoachClientProfile } from "~/bounded-contexts/clients/client-profile/ui/coach/profile/coach-client-profile";
import { clientFullName } from "~/bounded-contexts/clients/clients/public/clients";
import { ClientNotFound } from "~/surfaces/coach-portal/sections/client-not-found";

const CLIENT_NOT_FOUND_STATUS = 404;

export async function loader(args: LoaderFunctionArgs) {
  const { clientId } = args.params;

  if (!clientId) {
    throw new Response("Not Found", { status: CLIENT_NOT_FOUND_STATUS });
  }

  const [client, profile] = await Promise.all([
    args.context
      .get(clientsContext)
      .coachClientsController.loadClient(args, clientId),
    args.context
      .get(clientProfileContext)
      .clientProfileController.load(args, clientId),
  ]);

  return { clientId: client.clientId, profile };
}

export const meta: MetaFunction<typeof loader> = ({ loaderData }) => [
  {
    title: loaderData
      ? `${clientFullName(loaderData.profile.identity)} profile | Evoa`
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
