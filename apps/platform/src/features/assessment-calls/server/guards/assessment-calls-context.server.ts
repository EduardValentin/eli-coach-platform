import { createContext, type RouterContext } from "react-router";

import type { AssessmentCallsFeature } from "../assessment-calls-composition.server";

export const assessmentCallsContext: RouterContext<AssessmentCallsFeature> =
  createContext<AssessmentCallsFeature>();
