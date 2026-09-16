import { clerkMiddleware, rootAuthLoader } from "@clerk/react-router/server";
import type { LoaderFunctionArgs } from "react-router";

import { createAccountResolutionMiddleware } from "~/features/accounts/server/account-resolution-middleware.server";

export const middleware = [clerkMiddleware(), createAccountResolutionMiddleware()];

export function loader(args: LoaderFunctionArgs) {
  return rootAuthLoader(args);
}
