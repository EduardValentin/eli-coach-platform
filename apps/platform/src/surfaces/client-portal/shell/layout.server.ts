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
      portal: "client",
      request,
    });

    if (authorization.status === "denied") {
      throw authorization.response;
    }

    const response = await next();

    applyIdentityHeaders(response, authorization.headers);

    return response;
  },
];
