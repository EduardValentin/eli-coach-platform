import type { MiddlewareFunction } from "react-router";

import {
  applyIdentityHeaders,
} from "@eli-coach-platform/infrastructure/identity/server";

import { getPlatformContainer } from "~/server/container.server";

// Middleware rather than a loader, deliberately: see docs/AUTHENTICATION.md,
// "Authorization".
export const middleware: MiddlewareFunction<Response>[] = [
  async ({ request }, next) => {
    const authorization = await getPlatformContainer().authController.authorizePortal({
      portal: "coach",
      request,
    });

    if (authorization.status === "denied") {
      throw authorization.response;
    }

    // Clerk may have refreshed the session while authorizing, and on a
    // production instance a handshake establishes it here. Those cookies reach
    // the browser only if they are put on the response this guard let through.
    const response = await next();

    applyIdentityHeaders(response, authorization.headers);

    return response;
  },
];
