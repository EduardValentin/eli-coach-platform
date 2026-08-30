import { createContext, type RouterContext } from "react-router";

import type { Account } from "@eli-coach-platform/domain";

// React Router 7.18's v8_middleware future flag ships `createContext` and
// `RouterContext` unprefixed (no `unstable_` prefix) — verified against
// node_modules/react-router/dist/development/data-CjO11-hU.d.ts.
export type ResolvedSession =
  | { kind: "anonymous" }
  | { kind: "authenticated"; account: Account };

// The default is fail-closed and deliberate: `RouterContextProvider.get`
// throws when a context has neither a set value nor a default, which would
// turn any loader reading this on a path the middleware chose not to resolve
// — /sign-in-failed, where provisioning must not run — into a 500 instead of a
// page. Anonymous is the safe reading: it grants nothing, and every guard
// already treats it as "not signed in".
export const accountContext: RouterContext<ResolvedSession> =
  createContext<ResolvedSession>({ kind: "anonymous" });

export const SIGN_IN_FAILED_PATH = "/sign-in-failed";
