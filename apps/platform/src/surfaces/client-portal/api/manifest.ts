import { joinBasePath } from "@eli-coach-platform/config";
import { pwaSurfaceDefinitions } from "@eli-coach-platform/infrastructure/pwa";

const basePath = import.meta.env.BASE_URL;

// `start_url` has to resolve inside `scope`, and `/client` does not sit inside
// `/client/` — a browser that finds it outside drops the declared scope and
// falls back to the manifest's own directory. One trailing-slashed URL is
// therefore the identity, the launch target and the scope at once; React Router
// serves `/client/` and `/client` as the same route.
const clientPortalUrl = joinBasePath(basePath, "client/");

export function loader() {
  return Response.json(
    {
      id: clientPortalUrl,
      name: pwaSurfaceDefinitions.client.name,
      short_name: pwaSurfaceDefinitions.client.shortName,
      description: pwaSurfaceDefinitions.client.description,
      display: "standalone",
      background_color: "#f7f3ea",
      theme_color: pwaSurfaceDefinitions.client.themeColor,
      start_url: clientPortalUrl,
      scope: clientPortalUrl,
      icons: [
        {
          src: joinBasePath(basePath, "icon.svg"),
          sizes: "any",
          type: "image/svg+xml",
        },
      ],
    },
    {
      headers: {
        "content-type": "application/manifest+json; charset=utf-8",
      },
    },
  );
}
