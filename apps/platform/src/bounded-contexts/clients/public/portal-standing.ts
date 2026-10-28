import { createContext, type RouterContext } from "react-router";

import type { ClientJourneyStepName } from "./client-journey-step";

type ClientPortalReach = "reachable" | "awaiting_onboarding" | "ended";

export type ClientPortalStandingDto = {
  step: ClientJourneyStepName;
  portal: ClientPortalReach;
};

export const clientPortalStandingContext: RouterContext<ClientPortalStandingDto | null> =
  createContext<ClientPortalStandingDto | null>(null);
