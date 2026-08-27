import { ClerkProvider } from "@clerk/react-router";
import { joinBasePath } from "@eli-coach-platform/config";
import { MotionConfig } from "motion/react";
import "~/app.css";
import type { PropsWithChildren } from "react";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useRouteError,
  type LinksFunction,
  type MetaFunction,
} from "react-router";

import { createAccountResolutionMiddleware } from "~/features/accounts/api/account-resolution-middleware.server";
import { getPlatformContainer } from "~/server/container.server";

import { PlatformQueryProvider } from "./query-client";
import { RootErrorPage } from "./root-error-page";
import { middleware as baseMiddleware } from "./root.server";
import type { loader } from "./root.server";

export { loader } from "./root.server";

// `~/server/container.server` is the composition root and may only be
// reached from root.tsx (or an equivalent allowlisted file) — root.server.ts
// itself is fenced off, so the account-resolution middleware is composed here
// rather than inside the array root.server.ts exports.
export const middleware = [
  ...baseMiddleware,
  createAccountResolutionMiddleware(getPlatformContainer),
];

const assetBasePath = import.meta.env.BASE_URL;

// React Router hands the errored route's own `meta` the error, which is the
// only place a 404 can name itself before `<Meta />` renders. Without the two
// error arms the document keeps the app's default title, and an unmatched URL
// reads as the home page in history, bookmarks and search results.
export const meta: MetaFunction = ({ error }) => {
  if (isRouteErrorResponse(error) && error.status === 404) {
    return [
      { title: "Page Not Found | Eli Coach Platform" },
      {
        name: "description",
        content: "This page does not exist. Head back to the home page.",
      },
    ];
  }

  if (error) {
    return [
      { title: "Something Went Wrong | Eli Coach Platform" },
      {
        name: "description",
        content: "This page could not be loaded. Please try again.",
      },
    ];
  }

  return [
    { title: "Eli Coach Platform" },
    {
      name: "description",
      content:
        "Coaching for women who want training, nutrition support, and a plan that fits real life.",
    },
  ];
};

export const links: LinksFunction = () => [
  { rel: "icon", href: joinBasePath(assetBasePath, "icon.svg"), type: "image/svg+xml" },
];

// React Router renders `ErrorBoundary` *instead of* the default export, so the
// document shell has to live in `Layout` — the one component that wraps both.
// While it sat on `Root`, an unmatched URL lost `<head>`, the stylesheet and
// the title along with the route tree, which is what rendered the old bare
// "Unhandled Thrown Response!" page.
export function Layout({ children }: PropsWithChildren) {
  return (
    <html className="relative" lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <PlatformQueryProvider>
          <MotionConfig reducedMotion="user">{children}</MotionConfig>
        </PlatformQueryProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  const loaderData = useLoaderData<typeof loader>();
  return (
    <ClerkProvider loaderData={loaderData}>
      <Outlet />
    </ClerkProvider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <RootErrorPage
        description="The page you asked for doesn't exist, or it has moved somewhere else."
        heading="Page not found"
        statusLabel="Error 404"
      />
    );
  }

  return (
    <RootErrorPage
      description="Something went wrong at our end. Try again in a moment, or head back to the home page."
      heading="Something went wrong"
      statusLabel={resolveErrorStatusLabel(error)}
    />
  );
}

function resolveErrorStatusLabel(error: unknown) {
  return isRouteErrorResponse(error) ? `Error ${error.status}` : "Unexpected error";
}
