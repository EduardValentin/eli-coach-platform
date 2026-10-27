import { NotificationBell, PortalShell } from "~/shared/design-system/layout";
import { Dumbbell } from "lucide-react";
import { useState } from "react";
import {
  Outlet,
  useLoaderData,
  type LoaderFunctionArgs,
  type MetaFunction,
  type ShouldRevalidateFunction,
} from "react-router";

import {
  COACH_PORTAL_ROUTE_SEGMENT,
  type PortalRouteHandle,
} from "~/bounded-contexts/access/accounts/public/paths";
import {
  checkInsContext,
  notificationsContext,
} from "~/bounded-contexts/clients/public/request-context";
import { describeCheckInNotification } from "~/bounded-contexts/clients/check-ins/ui/shared/bell/check-in-bell-copy";
import type { NotificationBellReply } from "~/bounded-contexts/clients/notifications/public/notifications";
import { useNotificationBell } from "~/bounded-contexts/clients/notifications/ui/shared/notification-bell";

import {
  coachSurfaceLinksOf,
  type CoachNavigationCounts,
} from "./navigation-links";

const COACH_PORTAL_TITLE = "Coach Portal | Evoa";
const COACH_PORTAL_DESCRIPTION =
  "Coach-facing workspace for client management, planning, scheduling, and communication.";
const COACH_PORTAL_THEME_COLOR = "#17212f";

const NOTIFICATION_DESCRIBERS = [describeCheckInNotification];

type CoachShell = CoachNavigationCounts & {
  bell: NotificationBellReply;
};

export async function loader(args: LoaderFunctionArgs): Promise<CoachShell> {
  const [checkInsAwaiting, bell] = await Promise.all([
    args.context.get(checkInsContext).coachCheckIns.loadAwaitingCount(args),
    args.context.get(notificationsContext).notificationBell.loadBell(args),
  ]);

  return { checkInsAwaiting, bell };
}

export const shouldRevalidate: ShouldRevalidateFunction = ({
  currentUrl,
  nextUrl,
  defaultShouldRevalidate,
}) => defaultShouldRevalidate || currentUrl.pathname !== nextUrl.pathname;

export const handle = {
  portal: COACH_PORTAL_ROUTE_SEGMENT,
} satisfies PortalRouteHandle;

export const meta: MetaFunction = () => [
  { title: COACH_PORTAL_TITLE },
  {
    name: "description",
    content: COACH_PORTAL_DESCRIPTION,
  },
  {
    name: "theme-color",
    content: COACH_PORTAL_THEME_COLOR,
  },
];

// Non-navigating: the prototype links this block to a coach profile page
// that is out of MVP scope.
function CoachBrand() {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-compact bg-text-primary text-text-inverted shadow-action"
        data-parity="sidebar-brand-mark"
      >
        <Dumbbell aria-hidden="true" className="-rotate-45" size={20} />
      </div>
      <div className="min-w-0" data-parity="sidebar-brand-name">
        <p className="font-heading text-lg font-semibold text-text-primary">
          Evoa
        </p>
        <p className="text-micro font-bold uppercase tracking-widest text-primary">
          Coach Portal
        </p>
      </div>
    </div>
  );
}

function CoachTopBarBrand() {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-compact bg-text-primary text-text-inverted"
        data-parity="top-bar-brand-mark"
      >
        <Dumbbell aria-hidden="true" className="-rotate-45" size={16} />
      </div>
      <span className="text-sm font-medium text-text-primary">
        Coach Portal
      </span>
    </div>
  );
}

export default function CoachLayoutRoute() {
  const { bell, ...counts } = useLoaderData<typeof loader>();
  const notificationBell = useNotificationBell({
    bell,
    describers: NOTIFICATION_DESCRIBERS,
    party: "coach",
  });
  const [isTopBarBellOpen, setIsTopBarBellOpen] = useState(false);

  return (
    <PortalShell
      asideLabel="Coach portal sidebar"
      brand={<CoachBrand />}
      links={coachSurfaceLinksOf(counts)}
      mobileNavigation={{
        kind: "drawer",
        label: "Coach portal mobile navigation",
      }}
      navigationLabel="Coach portal navigation"
      sidebarActions={
        <div className="contents" data-parity="notification-bell">
          <NotificationBell {...notificationBell} align="start" />
        </div>
      }
      topBarActions={
        <div className="contents" data-parity="notification-bell">
          <NotificationBell
            {...notificationBell}
            onOpenChange={setIsTopBarBellOpen}
            open={isTopBarBellOpen}
          />
        </div>
      }
      topBarBrand={<CoachTopBarBrand />}
      topBarLabel="Coach portal top bar"
    >
      <Outlet />
    </PortalShell>
  );
}
