import { clerkMiddleware, rootAuthLoader } from "@clerk/react-router/server";
import type { LoaderFunctionArgs } from "react-router";

import { createAccountResolutionMiddleware } from "~/features/accounts/server/account-resolution-middleware.server";
import { getPlatformContainer } from "~/server/container.server";
import { getRuntimeEnvironment } from "~/server/runtime-environment.server";

export const middleware = [
  clerkMiddleware(),
  createAccountResolutionMiddleware(getPlatformContainer, getRuntimeEnvironment),
];

export function loader(args: LoaderFunctionArgs) {
  return rootAuthLoader(args);
}
