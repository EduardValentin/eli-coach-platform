import type { PortalNavigationLink } from "@eli-coach-platform/ui";
import { Activity, LayoutDashboard } from "lucide-react";

// Each link ships in the release that ships its destination page: later
// stories append here (Clients, Nutrition, Schedule, Settings) without
// touching the layout.
export const coachSurfaceLinks: readonly PortalNavigationLink[] = [
  {
    href: "/coach",
    label: "Dashboard",
    icon: <LayoutDashboard aria-hidden="true" size={18} />,
  },
  {
    href: "/coach/training",
    label: "Training",
    icon: <Activity aria-hidden="true" size={18} />,
  },
];
