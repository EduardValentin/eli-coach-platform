import type { PortalNavigationLink } from "@eli-coach-platform/ui/layout";
import { LayoutDashboard, Settings, Video } from "lucide-react";

import { COACH_PORTAL_PATH } from "~/features/accounts/contracts/paths";
import {
  COACH_ASSESSMENT_CALLS_PATH,
  COACH_SETTINGS_PATH,
} from "~/features/assessment-calls/contracts/paths";

// Each link ships in the release that ships its destination page: later
// stories append here (Clients, Training, Nutrition, Schedule) without
// touching the layout.
export const coachSurfaceLinks: readonly PortalNavigationLink[] = [
  { href: COACH_PORTAL_PATH, label: "Dashboard", icon: LayoutDashboard },
  { href: COACH_ASSESSMENT_CALLS_PATH, label: "Assessment calls", icon: Video },
  { href: COACH_SETTINGS_PATH, label: "Settings", icon: Settings },
];
