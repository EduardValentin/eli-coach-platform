import type { MiddlewareFunction } from "react-router";
import { accessContext } from "~/bounded-contexts/access/public/session";

// Route middleware, not a loader: React Router runs every matched loader in
// parallel, so a guard sitting in this layout's loader would not stop a child
// loader from running for a visitor who has no business in the portal.
// Middleware wraps the whole loader phase instead, so either the guard passes
// or nothing below it runs at all.
//
// The route has no loader of its own — the shell renders from static surface
// definitions — and needs none: middleware runs on every document request and
// on every data request a navigation makes, which is exactly when the guard
// has something to decide.
export const middleware: MiddlewareFunction<Response>[] = [
  (args, next) => {
    args.context.get(accessContext).requirePortalAccess("COACH");

    return next();
  },
];
