import type { MiddlewareFunction } from "react-router";

import { getPlatformContainer } from "~/server/container.server";

/**
 * The portal's gate, and deliberately a middleware rather than a loader.
 *
 * Single fetch lets the client name which loaders to run through the `_routes`
 * query parameter, so a loader-based gate is one the caller can decline:
 * `/coach.data?_routes=<some child>` would run that child and skip this. Middleware
 * runs in the server pipeline that wraps the whole request, where nothing the
 * client sends can filter it out.
 */
export const middleware: MiddlewareFunction[] = [
  async ({ request }) => {
    const authorization = await getPlatformContainer().authController.authorizePortal({
      portal: "coach",
      request,
    });

    if (authorization.status === "denied") {
      throw authorization.response;
    }
  },
];
