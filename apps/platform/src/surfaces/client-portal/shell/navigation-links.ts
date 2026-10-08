import type { PortalNavigationLink } from "@eli-coach-platform/ui/layout";
import { Activity, FolderOpen, Settings, UserCircle } from "lucide-react";

import { CLIENT_PORTAL_PATH } from "~/features/accounts/public/paths";
import { CLIENT_PROFILE_PATH } from "~/features/client-profile/public/paths";
import { CLIENT_RESOURCES_PATH } from "~/features/client-resources/public/paths";
import { CLIENT_SETTINGS_PATH } from "~/features/coaching-sales/public/paths";

const DASHBOARD_LINK: PortalNavigationLink = {
  href: CLIENT_PORTAL_PATH,
  label: "Dashboard",
  icon: Activity,
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

export function clientSurfaceLinks(
  unopenedResources: number,
): readonly PortalNavigationLink[] {
  return [
    DASHBOARD_LINK,
    PROFILE_LINK,
    {
      href: CLIENT_RESOURCES_PATH,
      label: "Resources",
      icon: FolderOpen,
      marked: unopenedResources > 0,
    },
    SETTINGS_LINK,
  ];
}

export const clientTabLinks: readonly PortalNavigationLink[] = [
  DASHBOARD_LINK,
  PROFILE_LINK,
];
