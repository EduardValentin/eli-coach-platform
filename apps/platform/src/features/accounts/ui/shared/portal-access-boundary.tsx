import { isRouteErrorResponse, useRouteError } from "react-router";

import {
  AccessDeniedPage,
  type AccessDeniedRecovery,
} from "./access-denied-page";

// Both portals mount this as their layout's ErrorBoundary, so each layout
// names it once and neither owns a copy of the denial handling. A
// wrong-portal 403 is the only error a portal answers itself; everything
// else belongs to an ancestor.
export function PortalAccessBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 403) {
    return <AccessDeniedPage recovery={resolveRecovery(error.data)} />;
  }

  // Not a wrong-portal denial — root.tsx's own ErrorBoundary already covers
  // every other case (404, unexpected errors), so re-throwing hands the error
  // to the nearest ancestor boundary that defines one instead of duplicating
  // that handling here.
  throw error;
}

function resolveRecovery(data: unknown): AccessDeniedRecovery {
  const recovery = (data as { recovery?: unknown } | undefined)?.recovery;

  return recovery === "store" || recovery === "client-portal" || recovery === "coach-portal"
    ? recovery
    : "store";
}
