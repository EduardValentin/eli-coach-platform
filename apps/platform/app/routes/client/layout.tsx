import { joinBasePath } from "@eli-coach-platform/config";
import { pwaSurfaceDefinitions } from "@eli-coach-platform/domain";
import { Outlet, type LinksFunction, type MetaFunction } from "react-router";

const assetBasePath = import.meta.env.BASE_URL;
const serviceWorkerPath = joinBasePath(assetBasePath, "client/sw.js");
const manifestPath = joinBasePath(assetBasePath, "client/manifest.webmanifest");

export const meta: MetaFunction = () => [
  { title: pwaSurfaceDefinitions.client.name },
  {
    name: "description",
    content: pwaSurfaceDefinitions.client.description,
  },
  {
    name: "theme-color",
    content: pwaSurfaceDefinitions.client.themeColor,
  },
];

export const links: LinksFunction = () => [
  { rel: "manifest", href: manifestPath },
];

export default function ClientLayoutRoute() {
  return (
    <>
      <Outlet />
      <script
        dangerouslySetInnerHTML={{
          __html: `if ("serviceWorker" in navigator) { window.addEventListener("load", function () { navigator.serviceWorker.register("${serviceWorkerPath}", { scope: "${joinBasePath(assetBasePath, "client/")}" }); }); }`,
        }}
      />
    </>
  );
}
