import type { LoaderFunctionArgs } from "react-router";

import type { AccountRoleName } from "~/features/accounts/contracts/session";
import { getPlatformContainer } from "~/server/container.server";

export type CoachPortalLoaderData = {
  role: AccountRoleName;
};

/**
 * The portal's gate. A denial is thrown rather than returned so it short-circuits
 * the whole route tree — every page under this layout is behind it, and none of
 * them can be prerendered for the same reason.
 */
export async function loader({
  request,
}: LoaderFunctionArgs): Promise<CoachPortalLoaderData> {
  const authorization = await getPlatformContainer().authController.authorizePortal({
    portal: "coach",
    request,
  });

  if (authorization.status === "denied") {
    throw authorization.response;
  }

  return { role: authorization.role };
}
