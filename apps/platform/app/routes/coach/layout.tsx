import { coachSurfaceLinks, pwaSurfaceDefinitions } from "@eli-coach-platform/domain";
import { SidebarSurfaceLayout } from "@eli-coach-platform/ui";
import { Outlet, type LinksFunction, type MetaFunction } from "react-router";

import { createPwaRegistration } from "../pwa-registration";

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
