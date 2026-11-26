import type { ServerBuild } from "react-router";
import * as build from "virtual:react-router/server-build";

import { getRuntimeEnvironment } from "~/composition-root/runtime-environment";
import {
  joinBasePath,
  normalizeBasePath,
  registerAppBasePath,
} from "~/shared/http/base-path";

type AssetsManifest = ServerBuild["assets"];
type AssetsManifestRoute = NonNullable<AssetsManifest["routes"][string]>;

// The build is made for `/`; the prefix it is served under is chosen when the
// instance starts. React Router reads these three fields per request. One gap
// is accepted: the manifest file at `assets.url` keeps its `/`-built URLs, and
// the browser loads it only for very long, deep paths, which then lose their
// scripts and styles when served under a prefix.
export * from "virtual:react-router/server-build";

const servedBasePath = normalizeBasePath(getRuntimeEnvironment().APP_BASE_PATH);

registerAppBasePath(servedBasePath);

export const basename = servedBasePath;
export const publicPath = joinBasePath(servedBasePath, "/");
export const assets = servedAssetsManifest(build.assets);

function servedAssetsManifest(manifest: AssetsManifest): AssetsManifest {
  return {
    ...manifest,
    entry: {
      imports: manifest.entry.imports.map(servedUrl),
      module: servedUrl(manifest.entry.module),
    },
    routes: Object.fromEntries(
      Object.entries(manifest.routes).map(([routeId, route]) => [
        routeId,
        route && servedRoute(route),
      ]),
    ),
    url: servedUrl(manifest.url),
  };
}

function servedRoute(route: AssetsManifestRoute): AssetsManifestRoute {
  return {
    ...route,
    clientActionModule: servedOptionalUrl(route.clientActionModule),
    clientLoaderModule: servedOptionalUrl(route.clientLoaderModule),
    clientMiddlewareModule: servedOptionalUrl(route.clientMiddlewareModule),
    css: route.css?.map(servedUrl),
    hydrateFallbackModule: servedOptionalUrl(route.hydrateFallbackModule),
    imports: route.imports?.map(servedUrl),
    module: servedUrl(route.module),
  };
}

function servedOptionalUrl(builtUrl: string | undefined): string | undefined {
  return builtUrl === undefined ? undefined : servedUrl(builtUrl);
}

function servedUrl(builtUrl: string): string {
  return joinBasePath(servedBasePath, builtUrl);
}
