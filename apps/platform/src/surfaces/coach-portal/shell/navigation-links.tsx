import type { PortalNavigationLink } from "~/shared/design-system/layout";
import {
  Activity,
  CalendarDays,
  LayoutDashboard,
  Settings,
  Users,
  Utensils,
  Video,
} from "lucide-react";

import { COACH_PORTAL_PATH } from "~/bounded-contexts/access/public/paths";
import {
  COACH_ASSESSMENT_CALLS_PATH,
  COACH_SETTINGS_PATH,
} from "~/bounded-contexts/scheduling/public/paths";
import { COACH_CHECK_INS_PATH } from "~/bounded-contexts/clients/check-ins/public/paths";
import { COACH_CLIENTS_PATH } from "~/bounded-contexts/clients/clients/public/paths";
import { COACH_TRAINING_PATH } from "~/bounded-contexts/programs/exercise-library/public/paths";
import { COACH_NUTRITION_PATH } from "~/bounded-contexts/programs/nutrition-library/public/paths";

export type CoachNavigationCounts = {
  checkInsAwaiting: number;
};

export function coachSurfaceLinksOf(
  counts: CoachNavigationCounts,
): readonly PortalNavigationLink[] {
  return [
    { href: COACH_PORTAL_PATH, label: "Dashboard", icon: LayoutDashboard },
    { href: COACH_TRAINING_PATH, label: "Training", icon: Activity },
    { href: COACH_NUTRITION_PATH, label: "Nutrition", icon: Utensils },
    { href: COACH_CLIENTS_PATH, label: "Clients", icon: Users },
    {
      href: COACH_CHECK_INS_PATH,
      label: "Check-ins",
      icon: CalendarDays,
      count: counts.checkInsAwaiting,
    },
    {
      href: COACH_ASSESSMENT_CALLS_PATH,
      label: "Assessment calls",
      icon: Video,
    },
    { href: COACH_SETTINGS_PATH, label: "Settings", icon: Settings },
  ];
}
