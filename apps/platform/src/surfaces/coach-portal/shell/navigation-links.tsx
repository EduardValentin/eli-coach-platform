import type { PortalNavigationLink } from "@eli-coach-platform/ui";
import { LayoutDashboard } from "lucide-react";

import { COACH_PORTAL_PATH } from "~/features/accounts/contracts/paths";

// Each link ships in the release that ships its destination page: later
// stories append here (Clients, Training, Nutrition, Schedule, Settings)
// without touching the layout.
export const coachSurfaceLinks: readonly PortalNavigationLink[] = [
  {
    href: COACH_PORTAL_PATH,
    label: "Dashboard",
    icon: <LayoutDashboard aria-hidden="true" size={18} />,
  },
];
