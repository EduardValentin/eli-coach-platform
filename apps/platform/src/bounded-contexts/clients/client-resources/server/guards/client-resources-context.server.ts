import { createContext, type RouterContext } from "react-router";

import type { ClientResourcesFeature } from "../client-resources-composition.server";

export const clientResourcesContext: RouterContext<ClientResourcesFeature> =
  createContext<ClientResourcesFeature>();
