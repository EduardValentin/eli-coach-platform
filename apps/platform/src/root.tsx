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

import {
  AccessDeniedPage,
  resolveAccessDeniedRecovery,
} from "~/features/accounts/ui/shared/access-denied-page";

import { PlatformQueryProvider } from "./query-client";
import { RootErrorPage } from "./root-error-page";
import type { loader } from "./root.server";

export { loader, middleware } from "./root.server";

const assetBasePath = import.meta.env.BASE_URL;

// React Router hands the errored route's own `meta` the error, which is the
// only place a 404 can name itself before `<Meta />` renders. Without the
// error arms the document keeps the app's default title, and an unmatched URL
// reads as the home page in history, bookmarks and search results.
//
// The 403 arm exists for the same reason at the other end: a portal denial is
// rendered by this route's boundary, so without it a page telling a person
// they have no access would sit in their history under the app's own name.
export const meta: MetaFunction = ({ error }) => {
  if (isRouteErrorResponse(error) && error.status === 404) {
    return [
      { title: "Page Not Found | Evoa" },
      {
        name: "description",
        content: "This page does not exist. Head back to the home page.",
      },
    ];
  }

  if (isRouteErrorResponse(error) && error.status === 403) {
    return [
      { title: "Access denied | Evoa" },
      {
        name: "description",
        content:
          "This page is not available to your account. Head back to a page you can reach.",
      },
    ];
  }

  if (error) {
    return [
      { title: "Something Went Wrong | Evoa" },
      {
        name: "description",
        content: "This page could not be loaded. Please try again.",
      },
    ];
  }

  return [
    { title: "Evoa" },
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

  // A portal guard is route middleware, and React Router bubbles a middleware
  // error past every route that was going to load data — the root's own loader
  // included — so this boundary is where a portal denial lands no matter which
  // portal threw it. The recovery destination travels in the response body the
  // guard wrote.
  if (isRouteErrorResponse(error) && error.status === 403) {
    return <AccessDeniedPage recovery={resolveAccessDeniedRecovery(error.data)} />;
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
