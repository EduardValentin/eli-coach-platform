import { createContext, type RouterContext } from "react-router";

import type { AccountSession } from "@eli-coach-platform/domain";

// React Router 7.18's v8_middleware future flag ships `createContext` and
// `RouterContext` unprefixed (no `unstable_` prefix) — verified against
// node_modules/react-router/dist/development/data-CjO11-hU.d.ts.
export const accountContext: RouterContext<AccountSession> =
  createContext<AccountSession>({ kind: "anonymous" });

export const SIGN_IN_FAILED_PATH = "/sign-in-failed";
