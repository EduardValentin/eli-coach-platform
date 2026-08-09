import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import {
  handleHttpErrorResponse,
  throwMethodNotAllowedResponse,
} from "~/server/http.server";
import { getPlatformContainer } from "~/server/container.server";

// This route module is registered in routes.ts without a `.server` suffix,
// because React Router strips `.server` files from the client route
// manifest, and every registered route — resource routes included — must
// resolve there. The controller lives in the sibling `waitlist-controller
// .server.ts` rather than inline in this file: React Router only removes
// server code from the `loader`/`action`/`middleware`/`headers` exports of a
// route module — any other export (a controller class, a factory function)
// keeps its full body and its imports in the client bundle. Since the
// controller depends on bot-detection verification, request-body hashing,
// and the shared HTTP error type — all genuinely server-only — exporting it
// from this same file reproduces the exact "server-only module referenced
// by client" failure this fix resolves. Splitting it into its own
// `.server`-suffixed file (never registered as a route, so the suffix rule
// doesn't apply to it) keeps the controller out of the client bundle
// entirely: `getPlatformContainer()` below is called only inside the
// handler bodies, so its own `.server` import is dropped from the client
// build the same way.
export async function action({ request }: ActionFunctionArgs) {
  return handleHttpErrorResponse(() => {
    if (request.method !== "POST") {
      throwMethodNotAllowedResponse({
        allowedMethods: ["GET", "POST"],
      });
    }

    return getPlatformContainer().waitlistController.join(request);
  });
}

export async function loader({ request }: LoaderFunctionArgs) {
  return handleHttpErrorResponse(() => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      throwMethodNotAllowedResponse({
        allowedMethods: ["GET", "POST"],
      });
    }

    return getPlatformContainer().waitlistController.getWaitlist();
  });
}
