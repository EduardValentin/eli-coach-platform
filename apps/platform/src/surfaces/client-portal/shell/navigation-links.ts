import type { PortalNavigationLink } from "@eli-coach-platform/ui/layout";
import {
  Activity,
  CalendarCheck,
  FolderOpen,
  Settings,
  UserCircle,
} from "lucide-react";

import { CLIENT_PORTAL_PATH } from "~/features/accounts/public/paths";
import { CLIENT_CHECK_INS_PATH } from "~/features/check-ins/public/paths";
import { CLIENT_PROFILE_PATH } from "~/features/client-profile/public/paths";
import { CLIENT_RESOURCES_PATH } from "~/features/client-resources/public/paths";
import { CLIENT_SETTINGS_PATH } from "~/features/coaching-sales/public/paths";

const DASHBOARD_LINK: PortalNavigationLink = {
  href: CLIENT_PORTAL_PATH,
  label: "Dashboard",
  icon: Activity,
};

const CHECK_INS_LINK: PortalNavigationLink = {
  href: CLIENT_CHECK_INS_PATH,
  label: "Check-ins",
  icon: CalendarCheck,
};

const PROFILE_LINK: PortalNavigationLink = {
  href: CLIENT_PROFILE_PATH,
  label: "Profile",
  icon: UserCircle,
};

const SETTINGS_LINK: PortalNavigationLink = {
  href: CLIENT_SETTINGS_PATH,
  label: "Settings",
  icon: Settings,
};

export type ClientNavigationCounts = {
  checkInsAwaiting: number;
  unopenedResources: number;
};

type ClientNavigation = {
  links: readonly PortalNavigationLink[];
  tabs: readonly PortalNavigationLink[];
};

export function clientNavigationOf(
  counts: ClientNavigationCounts,
): ClientNavigation {
  const checkIns = { ...CHECK_INS_LINK, count: counts.checkInsAwaiting };

  return {
    links: [
      DASHBOARD_LINK,
      checkIns,
      PROFILE_LINK,
      {
        href: CLIENT_RESOURCES_PATH,
        label: "Resources",
        icon: FolderOpen,
        marked: counts.unopenedResources > 0,
      },
      SETTINGS_LINK,
    ],
    tabs: [DASHBOARD_LINK, checkIns, PROFILE_LINK],
  };
}
