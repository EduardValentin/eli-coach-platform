import { createContext, type RouterContext } from "react-router";

import type { Account } from "@eli-coach-platform/domain";

// React Router 7.18's v8_middleware future flag ships `createContext` and
// `RouterContext` unprefixed (no `unstable_` prefix) — verified against
// node_modules/react-router/dist/development/data-CjO11-hU.d.ts.
export type ResolvedSession =
  | { kind: "anonymous" }
  | { kind: "authenticated"; account: Account };

export const accountContext: RouterContext<ResolvedSession> =
  createContext<ResolvedSession>();

export const SIGN_IN_FAILED_PATH = "/sign-in-failed";
