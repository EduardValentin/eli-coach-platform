import type { LoaderFunctionArgs } from "react-router";

import { requirePortalAccess } from "~/features/accounts/ui/shared/require-account.server";
import { getRuntimeEnvironment } from "~/server/runtime-environment.server";

export function loader(args: LoaderFunctionArgs) {
  const environment = getRuntimeEnvironment();

  requirePortalAccess(args, {
    publicAppUrl: environment.PUBLIC_APP_URL,
    role: "CLIENT",
    signInUrl: environment.CLERK_SIGN_IN_URL,
  });

  return null;
}
