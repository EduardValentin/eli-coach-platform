import { createContext, type RouterContext } from "react-router";

import type { CheckInsFeature } from "../check-ins-composition.server";

export const checkInsContext: RouterContext<CheckInsFeature> =
  createContext<CheckInsFeature>();
