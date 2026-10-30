import { createContext, type RouterContext } from "react-router";

import type { RuntimeConfig } from "../platform-composition.server";

export const runtimeConfigContext: RouterContext<RuntimeConfig> =
  createContext<RuntimeConfig>();
