import type { PortalNavigationLink } from "@eli-coach-platform/ui/layout";
import { Activity, UserCircle } from "lucide-react";

import { CLIENT_PORTAL_PATH } from "~/features/accounts/contracts/paths";
import { CLIENT_PROFILE_PATH } from "~/features/client-profile/contracts/paths";

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

export const clientSurfaceLinks: readonly PortalNavigationLink[] = [
  DASHBOARD_LINK,
  PROFILE_LINK,
];

export const clientTabLinks: readonly PortalNavigationLink[] = [
  DASHBOARD_LINK,
  PROFILE_LINK,
];
