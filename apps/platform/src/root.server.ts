import { clerkMiddleware, rootAuthLoader } from "@clerk/react-router/server";
import type { LoaderFunctionArgs } from "react-router";

import { createAccountResolutionMiddleware } from "~/features/accounts/server/account-resolution-middleware.server";
import { getPlatformContainer } from "~/server/container.server";
import { createFeatureContextMiddleware } from "~/server/feature-contexts.server";

export const middleware = [
  clerkMiddleware(),
  createFeatureContextMiddleware(getPlatformContainer),
  createAccountResolutionMiddleware(),
];

export function loader(args: LoaderFunctionArgs) {
  return rootAuthLoader(args);
}
