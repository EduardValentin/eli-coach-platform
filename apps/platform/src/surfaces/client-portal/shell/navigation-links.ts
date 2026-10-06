import type { PortalNavigationLink } from "@eli-coach-platform/ui/layout";
import { Activity, Settings, UserCircle } from "lucide-react";

import { CLIENT_PORTAL_PATH } from "~/features/accounts/contracts/paths";
import { CLIENT_PROFILE_PATH } from "~/features/client-profile/contracts/paths";
import { CLIENT_SETTINGS_PATH } from "~/features/coaching-sales/contracts/paths";

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

export const clientSurfaceLinks: readonly PortalNavigationLink[] = [
  DASHBOARD_LINK,
  PROFILE_LINK,
  SETTINGS_LINK,
];

export const clientTabLinks: readonly PortalNavigationLink[] = [
  DASHBOARD_LINK,
  PROFILE_LINK,
];
