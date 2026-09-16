import { buildRedirectPath } from "@eli-coach-platform/config";
import type { LoaderFunctionArgs } from "react-router";

import { accountsContext } from "~/features/accounts/server/guards/accounts-context.server";
import { STORE_PATH } from "~/features/store/contracts/paths";

export type SignInFailedLoaderData = {
  storePath: string;
};

// Where a successful retry lands. Without it Clerk returns the visitor to the
// page they signed in from — this one — and they would read the failure copy
// while signed in. The store is the same destination the public nav's Sign In
// control uses, and the base path has to be joined here because Clerk sends
// the browser to this value directly, outside the router's basename.
export function loader(args: LoaderFunctionArgs): SignInFailedLoaderData {
  const { appBasePath } = args.context.get(accountsContext).portal;

  return {
    storePath: buildRedirectPath(appBasePath, STORE_PATH),
  };
}
