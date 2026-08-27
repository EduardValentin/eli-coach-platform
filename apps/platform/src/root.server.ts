import { clerkMiddleware, rootAuthLoader } from "@clerk/react-router/server";
import type { LoaderFunctionArgs } from "react-router";

// root.server.ts may not reach `~/server/container.server` directly (the
// no-restricted-imports container rule only allows root.tsx, features/*/api,
// server/api, and *.server.ts under ui/**/surfaces/**) — root.tsx composes
// the account-resolution middleware onto this array instead.
export const middleware = [clerkMiddleware()];

export function loader(args: LoaderFunctionArgs) {
  return rootAuthLoader(args);
}
