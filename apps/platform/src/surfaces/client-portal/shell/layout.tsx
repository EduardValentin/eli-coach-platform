import { createPwaRegistration, pwaSurfaceDefinitions } from "~/shared/pwa";
import { NotificationBell, PortalShell } from "~/shared/design-system/layout";
import { useCalendarDayTimeZone } from "~/shared/design-system/lib";
import { Button } from "~/shared/design-system/primitives";
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
} from "~/bounded-contexts/access/accounts/public/paths";
import { SignOutControl } from "~/bounded-contexts/access/accounts/ui/shared/sign-out-control";
import type { ClientCheckIn } from "~/bounded-contexts/clients/check-ins/public/check-ins";
import {
  checkInsContext,
  clientProfileContext,
  clientResourcesContext,
  clientsContext,
  notificationsContext,
} from "~/bounded-contexts/clients/public/request-context";
import { NextCheckInWidget } from "~/bounded-contexts/clients/check-ins/ui/client/shell/next-check-in-widget";
import { describeCheckInNotification } from "~/bounded-contexts/clients/check-ins/ui/shared/bell/check-in-bell-copy";
import type { ClientAvatarUrl } from "~/bounded-contexts/clients/client-profile/public/client-avatar";
import type { NotificationBellReply } from "~/bounded-contexts/clients/notifications/public/notifications";
import { useNotificationBell } from "~/bounded-contexts/clients/notifications/ui/shared/notification-bell";

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

const NOTIFICATION_DESCRIBERS = [describeCheckInNotification];

type ClientShell = ClientNavigationCounts & {
  avatarUrl: ClientAvatarUrl;
  bell: NotificationBellReply;
  nextCheckIn: ClientCheckIn | null;
  presentation: ClientShellPresentation;
};

export async function loader(args: LoaderFunctionArgs): Promise<ClientShell> {
  const presentation = presentClientIdentity(
    args.context.get(clientsContext).clientJourney.loadIdentity(args),
  );

  const { clientCheckIns } = args.context.get(checkInsContext);
  const [avatarUrl, nextCheckIn, unopenedResources, checkInsAwaiting, bell] =
    await Promise.all([
      args.context.get(clientProfileContext).ownAvatar.url(args),
      clientCheckIns.loadNextCheckIn(args),
      args.context.get(clientResourcesContext).ownResources.countUnopened(args),
      clientCheckIns.loadAwaitingCount(args),
      args.context.get(notificationsContext).notificationBell.loadBell(args),
    ]);

  return {
    avatarUrl,
    presentation,
    nextCheckIn,
    unopenedResources,
    checkInsAwaiting,
    bell,
  };
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
  const { avatarUrl, bell, presentation, nextCheckIn, ...counts } =
    useLoaderData<typeof loader>();
  const notificationBell = useNotificationBell({
    bell,
    describers: NOTIFICATION_DESCRIBERS,
    party: "client",
  });
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
        brand={
          <ClientNameBlock
            avatarUrl={avatarUrl}
            displayName={displayName}
            size="md"
          />
        }
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
                avatarUrl={avatarUrl}
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
        sidebarActions={
          <div className="contents" data-parity="notification-bell">
            <NotificationBell {...notificationBell} align="start" />
          </div>
        }
        sidebarWidget={nextCheckInWidget}
        topBarActions={
          <div className="contents" data-parity="notification-bell">
            <NotificationBell {...notificationBell} />
          </div>
        }
        topBarBrand={
          <ClientNameBlock
            avatarUrl={avatarUrl}
            displayName={displayName}
            size="sm"
          />
        }
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
