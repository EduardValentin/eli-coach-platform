import { createContext, type RouterContext } from "react-router";

import type { Account } from "@eli-coach-platform/domain";

// Lives in ui/shared/ rather than api/ (where Task 5 first put it) because
// require-account.server.ts — the route-guard boundary every surface's portal
// layout must call into — reads accountContext directly, and a surface may
// only reach a feature through ui/{slice}/**, ui/shared/**, or contracts/**
// (ARCHITECTURE.md's boundary rules, enforced by eslint.config.mjs). Nothing
// here is genuinely account-API-private: it is the shared session-shape
// contract every layer (middleware, guards, loaders) reads and writes.
//
// React Router 7.18's v8_middleware future flag ships `createContext` and
// `RouterContext` unprefixed (no `unstable_` prefix) — verified against
// node_modules/react-router/dist/development/data-CjO11-hU.d.ts.
export type ResolvedSession =
  | { kind: "anonymous" }
  | { kind: "authenticated"; account: Account };

export const accountContext: RouterContext<ResolvedSession> =
  createContext<ResolvedSession>();

export const SIGN_IN_FAILED_PATH = "/sign-in-failed";
