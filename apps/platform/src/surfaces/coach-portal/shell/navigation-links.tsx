import type { PortalNavigationLink } from "@eli-coach-platform/ui/layout";
import {
  CalendarDays,
  LayoutDashboard,
  Settings,
  Users,
  Video,
} from "lucide-react";

import { COACH_PORTAL_PATH } from "~/features/accounts/public/paths";
import {
  COACH_ASSESSMENT_CALLS_PATH,
  COACH_SETTINGS_PATH,
} from "~/features/assessment-calls/public/paths";
import { COACH_CHECK_INS_PATH } from "~/features/check-ins/public/paths";
import { COACH_CLIENTS_PATH } from "~/features/coaching-sales/public/paths";

export const coachSurfaceLinks: readonly PortalNavigationLink[] = [
  { href: COACH_PORTAL_PATH, label: "Dashboard", icon: LayoutDashboard },
  { href: COACH_CLIENTS_PATH, label: "Clients", icon: Users },
  { href: COACH_CHECK_INS_PATH, label: "Check-ins", icon: CalendarDays },
  { href: COACH_ASSESSMENT_CALLS_PATH, label: "Assessment calls", icon: Video },
  { href: COACH_SETTINGS_PATH, label: "Settings", icon: Settings },
];
