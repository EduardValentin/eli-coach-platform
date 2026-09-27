import { createContext, type RouterContext } from "react-router";

import type { CoachingSalesFeature } from "../coaching-sales-composition.server";

export const coachingSalesContext: RouterContext<CoachingSalesFeature> =
  createContext<CoachingSalesFeature>();
