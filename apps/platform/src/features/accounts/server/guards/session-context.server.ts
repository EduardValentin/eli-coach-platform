import { createContext, type RouterContext } from "react-router";

import type { AccountSnapshot } from "@eli-coach-platform/domain/account";

export type ResolvedSession =
  { kind: "anonymous" } | { kind: "authenticated"; account: AccountSnapshot };

export const sessionContext: RouterContext<ResolvedSession> =
  createContext<ResolvedSession>({ kind: "anonymous" });
