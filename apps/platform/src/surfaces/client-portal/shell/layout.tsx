import {
  createPwaRegistration,
  pwaSurfaceDefinitions,
} from "@eli-coach-platform/infrastructure/pwa";
import { PortalShell } from "@eli-coach-platform/ui/layout";
import { useCalendarDayTimeZone } from "@eli-coach-platform/ui/lib";
import { Button } from "@eli-coach-platform/ui/primitives";
import { LogOut } from "lucide-react";
import {
  Outlet,
  useLoaderData,
  type LinksFunction,
  type LoaderFunctionArgs,
  type MetaFunction,
  type ShouldRevalidateFunction,
} from "react-router";

import {
  CLIENT_PORTAL_ROUTE_SEGMENT,
  type PortalRouteHandle,
} from "~/features/accounts/public/paths";
import { SignOutControl } from "~/features/accounts/ui/shared/sign-out-control";
import type { ClientCheckIn } from "~/features/check-ins/public/check-ins";
import { checkInsContext } from "~/features/check-ins/server/guards/check-ins-context.server";
import { NextCheckInWidget } from "~/features/check-ins/ui/client/shell/next-check-in-widget";
import { clientResourcesContext } from "~/features/client-resources/server/guards/client-resources-context.server";
import { clientsContext } from "~/features/clients/server/guards/clients-context.server";

import {
  presentClientIdentity,
  type ClientShellPresentation,
} from "./client-identity-presentation";
import { ClientNameBlock } from "./client-name-block";
import { clientPortalPageMeta } from "./client-portal-meta";
import {
  clientNavigationOf,
  type ClientNavigationCounts,
} from "./navigation-links";

const pwaRegistration = createPwaRegistration({
  assetBasePath: import.meta.env.BASE_URL,
  surface: "client",
});

type ClientShell = ClientNavigationCounts & {
  nextCheckIn: ClientCheckIn | null;
  presentation: ClientShellPresentation;
};

export async function loader(args: LoaderFunctionArgs): Promise<ClientShell> {
  const presentation = presentClientIdentity(
    args.context.get(clientsContext).clientJourney.loadIdentity(args),
  );

  const { clientCheckIns } = args.context.get(checkInsContext);
  const [nextCheckIn, unopenedResources, checkInsAwaiting] = await Promise.all([
    clientCheckIns.loadNextCheckIn(args),
    args.context.get(clientResourcesContext).ownResources.countUnopened(args),
    clientCheckIns.loadAwaitingCount(args),
  ]);

  return { presentation, nextCheckIn, unopenedResources, checkInsAwaiting };
}

export const shouldRevalidate: ShouldRevalidateFunction = ({
  currentUrl,
  nextUrl,
  defaultShouldRevalidate,
}) => defaultShouldRevalidate || currentUrl.pathname !== nextUrl.pathname;

export const handle = {
  portal: CLIENT_PORTAL_ROUTE_SEGMENT,
} satisfies PortalRouteHandle;

export const meta: MetaFunction = () =>
  clientPortalPageMeta(pwaSurfaceDefinitions.client.name);

export const links: LinksFunction = () => [
  { rel: "manifest", href: pwaRegistration.manifestPath },
];

export default function ClientLayoutRoute() {
  const { presentation, nextCheckIn, ...counts } =
    useLoaderData<typeof loader>();
  const { displayName } = presentation;
  const navigation = clientNavigationOf(counts);
  const timeZone = useCalendarDayTimeZone();
  const nextCheckInWidget = nextCheckIn && (
    <NextCheckInWidget checkIn={nextCheckIn} timeZone={timeZone} />
  );

  return (
    <>
      <PortalShell
        asideLabel="Client portal sidebar"
        brand={<ClientNameBlock displayName={displayName} size="md" />}
        links={navigation.links}
        mobileNavigation={{
          kind: "tabs",
          sheet: {
            footer: (
              <SignOutControl redirectUrl="/">
                <Button
                  data-parity="sheet-sign-out"
                  size="sm"
                  variant="ghost-muted"
                  className="w-full"
                >
                  <LogOut aria-hidden="true" size={16} />
                  Sign out
                </Button>
              </SignOutControl>
            ),
            renderHeader: (closeSheet) => (
              <ClientNameBlock
                displayName={displayName}
                onNavigate={closeSheet}
                size="md"
              />
            ),
            navigationLabel: "Client portal more",
            title: "More",
            widget: nextCheckInWidget,
          },
          tabs: navigation.tabs,
          tabsLabel: "Client portal tabs",
        }}
        navigationLabel="Client portal navigation"
        sidebarWidget={nextCheckInWidget}
        topBarBrand={<ClientNameBlock displayName={displayName} size="sm" />}
        topBarLabel="Client portal top bar"
      >
        <Outlet context={presentation} />
      </PortalShell>
      <script
        dangerouslySetInnerHTML={{
          __html: pwaRegistration.registrationScript,
        }}
      />
    </>
  );
}
