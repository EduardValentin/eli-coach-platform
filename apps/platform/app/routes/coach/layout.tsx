import { joinBasePath } from "@eli-coach-platform/config";
import { pwaSurfaceDefinitions } from "@eli-coach-platform/domain";
import { Outlet, type LinksFunction, type MetaFunction } from "react-router";

const assetBasePath = import.meta.env.BASE_URL;
const serviceWorkerPath = joinBasePath(assetBasePath, "coach/sw.js");
const manifestPath = joinBasePath(assetBasePath, "coach/manifest.webmanifest");

export const meta: MetaFunction = () => [
  { title: pwaSurfaceDefinitions.coach.name },
  {
    name: "description",
    content: pwaSurfaceDefinitions.coach.description,
  },
  {
    name: "theme-color",
    content: pwaSurfaceDefinitions.coach.themeColor,
  },
];

export const links: LinksFunction = () => [
  { rel: "manifest", href: manifestPath },
];

export default function CoachLayoutRoute() {
  return (
    <>
      <Outlet />
      <script
        dangerouslySetInnerHTML={{
          __html: `if ("serviceWorker" in navigator) { window.addEventListener("load", function () { navigator.serviceWorker.register("${serviceWorkerPath}", { scope: "${joinBasePath(assetBasePath, "coach/")}" }); }); }`,
        }}
      />
    </>
  );
}
