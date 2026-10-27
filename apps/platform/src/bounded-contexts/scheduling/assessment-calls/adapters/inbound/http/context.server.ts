import { createContext, type RouterContext } from "react-router";

import type { AssessmentCallsController } from "~/bounded-contexts/scheduling/assessment-calls/adapters/inbound/http/booking/assessment-calls-controller.server";
import type { CoachAssessmentCallsController } from "~/bounded-contexts/scheduling/assessment-calls/adapters/inbound/http/coach/coach-assessment-calls-controller.server";

export type AssessmentCallsFeature = {
  assessmentCalls: AssessmentCallsController;
  coachAssessmentCalls: CoachAssessmentCallsController;
};

export const assessmentCallsContext: RouterContext<AssessmentCallsFeature> =
  createContext<AssessmentCallsFeature>();
