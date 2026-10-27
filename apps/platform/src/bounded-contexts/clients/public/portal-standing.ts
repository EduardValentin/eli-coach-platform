import { createContext, type RouterContext } from "react-router";

type ClientJourneyStepName =
  | "welcome"
  | "onboarding"
  | "submitted"
  | "in-review"
  | "needs-details"
  | "approved";

type ClientPortalReach = "reachable" | "awaiting_onboarding" | "ended";

export type ClientPortalStandingDto = {
  step: ClientJourneyStepName;
  portal: ClientPortalReach;
};

export const clientPortalStandingContext: RouterContext<ClientPortalStandingDto | null> =
  createContext<ClientPortalStandingDto | null>(null);
