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

import { COACH_PORTAL_PATH } from "~/features/accounts/public/paths";
import { COACH_ASSESSMENT_CALLS_PATH } from "~/features/assessment-calls/public/paths";
import { COACH_CHECK_INS_PATH } from "~/features/check-ins/public/paths";
import { COACH_CLIENTS_PATH } from "~/features/clients/public/paths";
import { COACH_SETTINGS_PATH } from "~/features/coach-schedule/public/paths";
import { COACH_TRAINING_PATH } from "~/features/exercise-library/public/paths";
import { COACH_NUTRITION_PATH } from "~/features/nutrition-library/public/paths";

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
