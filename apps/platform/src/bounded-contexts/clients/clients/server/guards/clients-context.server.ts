import { createContext, type RouterContext } from "react-router";

import type { ClientsFeature } from "../clients-composition.server";

export const clientsContext: RouterContext<ClientsFeature> =
  createContext<ClientsFeature>();
