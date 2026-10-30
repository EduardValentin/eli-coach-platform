import { createContext, type RouterContext } from "react-router";

import type { CoachScheduleSettingsController } from "~/bounded-contexts/scheduling/coach-schedule/adapters/inbound/http/coach-schedule-settings-controller.server";

export type CoachScheduleFeature = {
  coachScheduleSettingsController: CoachScheduleSettingsController;
};

export const coachScheduleContext: RouterContext<CoachScheduleFeature> =
  createContext<CoachScheduleFeature>();
