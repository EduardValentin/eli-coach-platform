import type { MiddlewareFunction } from "react-router";

import { getPlatformContainer } from "~/server/container.server";

// Middleware rather than a loader, deliberately: see docs/AUTHENTICATION.md,
// "Authorization".
export const middleware: MiddlewareFunction[] = [
  async ({ request }) => {
    const authorization = await getPlatformContainer().authController.authorizePortal({
      portal: "client",
      request,
    });

    if (authorization.status === "denied") {
      throw authorization.response;
    }
  },
];
