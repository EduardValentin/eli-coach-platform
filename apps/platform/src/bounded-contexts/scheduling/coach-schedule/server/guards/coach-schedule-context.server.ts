import { createContext, type RouterContext } from "react-router";

import type { CoachScheduleFeature } from "../coach-schedule-composition.server";

export const coachScheduleContext: RouterContext<CoachScheduleFeature> =
  createContext<CoachScheduleFeature>();
