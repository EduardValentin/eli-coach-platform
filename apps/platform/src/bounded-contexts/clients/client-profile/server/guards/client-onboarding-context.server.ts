import { createContext, type RouterContext } from "react-router";

import type { ClientOnboardingFeature } from "../client-onboarding-composition.server";

export const clientOnboardingContext: RouterContext<ClientOnboardingFeature> =
  createContext<ClientOnboardingFeature>();
