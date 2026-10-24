import {
  useLoaderData,
  type LoaderFunctionArgs,
  type MetaFunction,
  type ShouldRevalidateFunctionArgs,
} from "react-router";

import { clientProfileContext } from "~/features/client-profile/server/guards/client-profile-context.server";
import {
  ClientsSection,
  ClientsUnavailable,
} from "~/features/clients/ui/coach/clients/clients-section";
import { haveOnlyRosterParamsChanged } from "~/features/clients/ui/coach/clients/roster-listing";
import { clientsContext } from "~/features/clients/server/guards/clients-context.server";

export async function loader(args: LoaderFunctionArgs) {
  const { clients } = await args.context
    .get(clientsContext)
    .coachClients.loadRoster(args);

  if (clients === null) {
    return { avatarUrls: {}, clients };
  }

  const avatarUrls = await args.context
    .get(clientProfileContext)
    .avatars.urlsFor(
      args,
      clients.map((client) => client.clientId),
    );

  return { avatarUrls, clients };
}

export function shouldRevalidate({
  currentUrl,
  defaultShouldRevalidate,
  nextUrl,
}: ShouldRevalidateFunctionArgs) {
  return haveOnlyRosterParamsChanged({ currentUrl, nextUrl })
    ? false
    : defaultShouldRevalidate;
}

export const meta: MetaFunction = () => [{ title: "Clients | Evoa" }];

export default function CoachClientsRoute() {
  const { avatarUrls, clients } = useLoaderData<typeof loader>();

  if (clients === null) {
    return <ClientsUnavailable />;
  }

  return <ClientsSection avatarUrls={avatarUrls} clients={clients} />;
}
