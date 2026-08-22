import { createPwaRegistration, pwaSurfaceDefinitions } from "@eli-coach-platform/infrastructure/pwa";
import { SidebarSurfaceLayout } from "@eli-coach-platform/ui";
import { Outlet, type LinksFunction, type MetaFunction } from "react-router";

import { coachSurfaceLinks } from "./navigation-links";
import { middleware } from "./layout.server";

// Registered in routes.ts, so this file cannot carry the `.server` suffix,
// and its authorization middleware lives in the sibling `layout.server.ts`.
// The rule, and why merging them breaks the build: ARCHITECTURE.md,
// under "The `.server` suffix".
export { middleware };

const pwaRegistration = createPwaRegistration({
  assetBasePath: import.meta.env.BASE_URL,
  surface: "coach",
});

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
  { rel: "manifest", href: pwaRegistration.manifestPath },
];

export default function CoachLayoutRoute() {
  return (
    <>
      <SidebarSurfaceLayout
        asideLabel="Coach portal sidebar"
        links={coachSurfaceLinks}
        navigationLabel="Coach portal navigation"
        title={pwaSurfaceDefinitions.coach.name}
      >
        <Outlet />
      </SidebarSurfaceLayout>
      <script
        dangerouslySetInnerHTML={{
          __html: pwaRegistration.registrationScript,
        }}
      />
    </>
  );
}
