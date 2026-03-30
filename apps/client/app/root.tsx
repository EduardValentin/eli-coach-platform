import { joinBasePath } from "@eli-coach-platform/config";
import "@eli-coach-platform/design-tokens/theme.css";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  type LinksFunction,
  type MetaFunction,
} from "react-router";

const assetBasePath = import.meta.env.BASE_URL;
const serviceWorkerPath = joinBasePath(assetBasePath, "sw.js");

export const meta: MetaFunction = () => [
  { title: "Eli Client Portal" },
  {
    name: "description",
    content: "Installable client experience for plans, check-ins, messages, and progress.",
  },
];

export const links: LinksFunction = () => [
  { rel: "manifest", href: joinBasePath(assetBasePath, "manifest.webmanifest") },
  { rel: "icon", href: joinBasePath(assetBasePath, "icon.svg"), type: "image/svg+xml" },
];

export default function Root() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#17212f" />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <script
          dangerouslySetInnerHTML={{
            __html: `if ("serviceWorker" in navigator) { window.addEventListener("load", function () { navigator.serviceWorker.register("${serviceWorkerPath}"); }); }`,
          }}
        />
      </body>
    </html>
  );
}
