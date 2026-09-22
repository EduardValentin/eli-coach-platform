import { createContext, type RouterContext } from "react-router";

import type { FeatureFlagEvaluation } from "@eli-coach-platform/domain/feature-flag";

import type { AssessmentCallsFeature } from "../assessment-calls-composition.server";

export const assessmentCallsContext: RouterContext<AssessmentCallsFeature> =
  createContext<AssessmentCallsFeature>();

export const assessmentCallsFeatureFlagEvaluationContext: RouterContext<FeatureFlagEvaluation> =
  createContext<FeatureFlagEvaluation>({ overrides: {} });
