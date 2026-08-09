import { joinBasePath } from "@eli-coach-platform/config";
import { pwaSurfaceDefinitions } from "@eli-coach-platform/domain";

const basePath = import.meta.env.BASE_URL;

export function loader() {
  const startUrl = joinBasePath(basePath, "coach");
  const scope = joinBasePath(basePath, "coach/");

  return Response.json(
    {
      id: startUrl,
      name: pwaSurfaceDefinitions.coach.name,
      short_name: pwaSurfaceDefinitions.coach.shortName,
      description: pwaSurfaceDefinitions.coach.description,
      display: "standalone",
      background_color: "#f7f3ea",
      theme_color: pwaSurfaceDefinitions.coach.themeColor,
      start_url: startUrl,
      scope,
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
