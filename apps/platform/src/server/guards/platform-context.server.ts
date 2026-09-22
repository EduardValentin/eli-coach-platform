import { createContext, type RouterContext } from "react-router";

import type { FeatureFlagEvaluation } from "@eli-coach-platform/domain/feature-flag";

import type { PlatformControllers } from "../platform-composition.server";

export const platformContext: RouterContext<PlatformControllers> =
  createContext<PlatformControllers>();

export const platformFeatureFlagEvaluationContext: RouterContext<FeatureFlagEvaluation> =
  createContext<FeatureFlagEvaluation>({ overrides: {} });
