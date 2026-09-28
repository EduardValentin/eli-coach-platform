import type { PortalNavigationLink } from "@eli-coach-platform/ui/layout";
import { LayoutDashboard, Settings, Users, Video } from "lucide-react";

import { COACH_PORTAL_PATH } from "~/features/accounts/contracts/paths";
import {
  COACH_ASSESSMENT_CALLS_PATH,
  COACH_SETTINGS_PATH,
} from "~/features/assessment-calls/contracts/paths";
import { COACH_CLIENTS_PATH } from "~/features/coaching-sales/contracts/paths";

export const coachSurfaceLinks: readonly PortalNavigationLink[] = [
  { href: COACH_PORTAL_PATH, label: "Dashboard", icon: LayoutDashboard },
  { href: COACH_CLIENTS_PATH, label: "Clients", icon: Users },
  { href: COACH_ASSESSMENT_CALLS_PATH, label: "Assessment calls", icon: Video },
  { href: COACH_SETTINGS_PATH, label: "Settings", icon: Settings },
];
