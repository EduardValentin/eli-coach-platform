import { createContext, type RouterContext } from "react-router";

export type AccountRole = "CLIENT" | "COACH";

export type SessionAccount = {
  authSubjectId: string;
  id: string;
  role: AccountRole;
};

export type ResolvedSession =
  { kind: "anonymous" } | { kind: "authenticated"; account: SessionAccount };

export type PortalLinks = {
  appBasePath: string;
  publicAppUrl: string | undefined;
  signInUrl: string;
};

export type AccessRequestContext = {
  portal: PortalLinks;
  requireAccount(options?: { role?: AccountRole }): SessionAccount;
  requirePortalAccess(role: AccountRole): SessionAccount;
  session: ResolvedSession;
};

export const accessContext: RouterContext<AccessRequestContext> =
  createContext<AccessRequestContext>({
    portal: { appBasePath: "/", publicAppUrl: undefined, signInUrl: "" },
    requireAccount: refuseUnauthenticated,
    requirePortalAccess: refuseUnauthenticated,
    session: { kind: "anonymous" },
  });

function refuseUnauthenticated(): never {
  throw Response.json({ error: "unauthenticated" }, { status: 401 });
}
