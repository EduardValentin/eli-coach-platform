import { createContext, type RouterContext } from "react-router";

import type { StoreFeature } from "../store-composition.server";

export const storeContext: RouterContext<StoreFeature> = createContext<StoreFeature>();
