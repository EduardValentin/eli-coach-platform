import {
  useLoaderData,
  type LoaderFunctionArgs,
  type MetaFunction,
  type ShouldRevalidateFunctionArgs,
} from "react-router";

import {
  clientProfileContext,
  clientsContext,
} from "~/bounded-contexts/clients/public/request-context";
import { clientAvatarSrc } from "~/bounded-contexts/clients/client-profile/ui/shared/avatar/client-avatar-src";
import {
  ClientsSection,
  ClientsUnavailable,
} from "~/bounded-contexts/clients/clients/ui/coach/clients/clients-section";
import { haveOnlyRosterParamsChanged } from "~/bounded-contexts/clients/clients/ui/coach/clients/roster-listing";

export async function loader(args: LoaderFunctionArgs) {
  const { clients } = await args.context
    .get(clientsContext)
    .coachClients.loadRoster(args);

  if (clients === null) {
    return { avatarUrls: {}, clients };
  }

  const avatarUrls = await args.context
    .get(clientProfileContext)
    .coachAvatars.urlsFor(
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

  const avatarSrcs = Object.fromEntries(
    Object.entries(avatarUrls).map(([clientId, avatarUrl]) => [
      clientId,
      clientAvatarSrc(avatarUrl),
    ]),
  );

  return <ClientsSection avatarSrcs={avatarSrcs} clients={clients} />;
}
