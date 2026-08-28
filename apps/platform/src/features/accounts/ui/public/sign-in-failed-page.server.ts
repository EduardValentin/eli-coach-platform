import { joinBasePath } from "@eli-coach-platform/config";

import { getRuntimeEnvironment } from "~/server/runtime-environment.server";

export type SignInFailedLoaderData = {
  storePath: string;
};

// Where a successful retry lands. Without it Clerk returns the visitor to the
// page they signed in from — this one — and they would read the failure copy
// while signed in. The store is the same destination the public nav's Sign In
// control uses, and the base path has to be joined here because Clerk sends
// the browser to this value directly, outside the router's basename.
export function loader(): SignInFailedLoaderData {
  return {
    storePath: joinBasePath(getRuntimeEnvironment().APP_BASE_PATH, "/store"),
  };
}
