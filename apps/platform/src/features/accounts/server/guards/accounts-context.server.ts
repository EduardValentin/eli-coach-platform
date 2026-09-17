import { createContext, type RouterContext } from "react-router";

import type { AccountsFeature } from "../accounts-composition.server";

export const accountsContext: RouterContext<AccountsFeature> =
  createContext<AccountsFeature>();
