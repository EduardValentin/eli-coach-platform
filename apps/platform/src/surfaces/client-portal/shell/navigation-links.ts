import type { PortalNavigationLink } from "@eli-coach-platform/ui/layout";
import { Activity } from "lucide-react";

import { CLIENT_PORTAL_PATH } from "~/features/accounts/contracts/paths";

const DASHBOARD_LINK: PortalNavigationLink = {
  href: CLIENT_PORTAL_PATH,
  label: "Dashboard",
  icon: Activity,
};

export const clientSurfaceLinks: readonly PortalNavigationLink[] = [
  DASHBOARD_LINK,
];

export const clientTabLinks: readonly PortalNavigationLink[] = [DASHBOARD_LINK];
