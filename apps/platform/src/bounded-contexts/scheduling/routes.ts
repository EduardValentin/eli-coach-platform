import {
  assessmentCallsApiRoutes,
  assessmentCallsBookingRoutes,
  assessmentCallsJoinRoutes,
} from "./assessment-calls/routes";
import {
  coachScheduleApiRoutes,
  coachScheduleCoachRoutes,
} from "./coach-schedule/routes";

export const schedulingRoutes = {
  api: [...coachScheduleApiRoutes, ...assessmentCallsApiRoutes],
  coachPortalShell: coachScheduleCoachRoutes,
  publicSite: assessmentCallsJoinRoutes,
  publicSiteShell: assessmentCallsBookingRoutes,
};
