import { createContext, type RouterContext } from "react-router";

import type { PlatformControllers } from "../platform-composition.server";

export const platformContext: RouterContext<PlatformControllers> =
  createContext<PlatformControllers>();
