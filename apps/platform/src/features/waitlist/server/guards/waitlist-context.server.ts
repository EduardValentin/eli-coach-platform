import { createContext, type RouterContext } from "react-router";

import type { FeatureFlagEvaluation } from "@eli-coach-platform/domain/feature-flag";

import type { WaitlistFeature } from "../waitlist-composition.server";

export const waitlistContext: RouterContext<WaitlistFeature> =
  createContext<WaitlistFeature>();

export const waitlistFeatureFlagEvaluationContext: RouterContext<FeatureFlagEvaluation> =
  createContext<FeatureFlagEvaluation>({ overrides: {} });
