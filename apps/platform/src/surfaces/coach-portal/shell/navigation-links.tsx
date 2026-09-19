import type { PortalNavigationLink } from "@eli-coach-platform/ui/layout";
import { LayoutDashboard, Video } from "lucide-react";

import { COACH_PORTAL_PATH } from "~/features/accounts/contracts/paths";
import { COACH_ASSESSMENT_CALLS_PATH } from "~/features/assessment-calls/contracts/paths";

// Each link ships in the release that ships its destination page: later
// stories append here (Clients, Training, Nutrition, Schedule, Settings)
// without touching the layout.
export const coachSurfaceLinks: readonly PortalNavigationLink[] = [
  {
    href: COACH_PORTAL_PATH,
    label: "Dashboard",
    icon: <LayoutDashboard aria-hidden="true" size={18} />,
  },
  {
    href: COACH_ASSESSMENT_CALLS_PATH,
    label: "Assessment calls",
    icon: <Video aria-hidden="true" size={18} />,
  },
];
