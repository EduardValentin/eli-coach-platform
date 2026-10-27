import { createContext, type RouterContext } from "react-router";

import type { AccountSnapshot } from "~/bounded-contexts/access/accounts/domain/account";

export type ResolvedSession =
  { kind: "anonymous" } | { kind: "authenticated"; account: AccountSnapshot };

export const sessionContext: RouterContext<ResolvedSession> =
  createContext<ResolvedSession>({ kind: "anonymous" });
