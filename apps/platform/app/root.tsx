import { joinBasePath } from "@eli-coach-platform/config";
import "~/app.css";
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

export const meta: MetaFunction = () => [
  { title: "Eli Coach Platform" },
  {
    name: "description",
    content: "Single full-stack React Router app serving marketing, client, and coach surfaces with clean internal boundaries.",
  },
];

export const links: LinksFunction = () => [
  { rel: "icon", href: joinBasePath(assetBasePath, "icon.svg"), type: "image/svg+xml" },
];

export default function Root() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
