import { createContext, type RouterContext } from "react-router";

import type { ClientProfileFeature } from "../client-profile-composition.server";

export const clientProfileContext: RouterContext<ClientProfileFeature> =
  createContext<ClientProfileFeature>();
