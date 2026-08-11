import { joinBasePath } from "@eli-coach-platform/config";
import { pwaSurfaceDefinitions } from "@eli-coach-platform/infrastructure/pwa";

const basePath = import.meta.env.BASE_URL;

// `start_url` has to resolve inside `scope`, and `/coach` does not sit inside
// `/coach/` — a browser that finds it outside drops the declared scope and
// falls back to the manifest's own directory. One trailing-slashed URL is
// therefore the identity, the launch target and the scope at once; React Router
// serves `/coach/` and `/coach` as the same route.
const coachPortalUrl = joinBasePath(basePath, "coach/");

export function loader() {
  return Response.json(
    {
      id: coachPortalUrl,
      name: pwaSurfaceDefinitions.coach.name,
      short_name: pwaSurfaceDefinitions.coach.shortName,
      description: pwaSurfaceDefinitions.coach.description,
      display: "standalone",
      background_color: "#f7f3ea",
      theme_color: pwaSurfaceDefinitions.coach.themeColor,
      start_url: coachPortalUrl,
      scope: coachPortalUrl,
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
