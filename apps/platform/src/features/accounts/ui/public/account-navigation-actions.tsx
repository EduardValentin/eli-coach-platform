import { Form, Link, useLocation } from "react-router";

import type {
  AccountRoleName,
  PublicSession,
  SessionPresentationState,
} from "~/features/accounts/contracts/session";

import { useSessionQuery } from "./query";

const NAV_ACTION_CLASS =
  "text-sm font-medium tracking-nav text-current transition-colors duration-150 ease-out hover:text-brand-primary";

const portalByRole: Partial<Record<AccountRoleName, { label: string; to: string }>> = {
  CLIENT: { label: "Client Portal", to: "/client" },
  COACH: { label: "Coach Portal", to: "/coach" },
};

export function resolveSessionPresentationState(query: {
  data: PublicSession | undefined;
  isPending: boolean;
}): SessionPresentationState {
  if (query.isPending || !query.data) {
    return "unresolved";
  }

  return query.data.status === "authenticated" ? "authenticated" : "anonymous";
}

export function AccountNavigationActions() {
  const location = useLocation();
  const sessionQuery = useSessionQuery();
  const presentationState = resolveSessionPresentationState(sessionQuery);

  // Reserves the row's height so the resolved control does not push the
  // navigation around, and says nothing it might have to take back.
  if (presentationState === "unresolved") {
    return <span aria-hidden="true" className="inline-block min-h-6 w-20" />;
  }

  if (presentationState === "anonymous") {
    const destination = `${location.pathname}${location.search}`;

    return (
      <Link
        className={NAV_ACTION_CLASS}
        to={`/auth/sign-in?redirect_url=${encodeURIComponent(destination)}`}
      >
        Sign In
      </Link>
    );
  }

  const role = sessionQuery.data?.status === "authenticated" ? sessionQuery.data.role : "USER";
  const portal = portalByRole[role];

  return (
    <>
      {portal ? (
        <Link className={NAV_ACTION_CLASS} to={portal.to}>
          {portal.label}
        </Link>
      ) : null}
      <Form action="/auth/sign-out" method="post">
        <button className={NAV_ACTION_CLASS} type="submit">
          Sign Out
        </button>
      </Form>
    </>
  );
}
