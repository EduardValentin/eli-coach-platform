import { createPwaRegistration, pwaSurfaceDefinitions } from "@eli-coach-platform/infrastructure/pwa";
import { SidebarSurfaceLayout } from "@eli-coach-platform/ui";
import { Outlet, type LinksFunction, type MetaFunction } from "react-router";

import { clientSurfaceLinks } from "./navigation-links";

export { middleware } from "./layout.server";

const pwaRegistration = createPwaRegistration({
  assetBasePath: import.meta.env.BASE_URL,
  surface: "client",
});

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
  { rel: "manifest", href: pwaRegistration.manifestPath },
];

export default function ClientLayoutRoute() {
  return (
    <>
      <SidebarSurfaceLayout
        asideLabel="Client portal sidebar"
        links={clientSurfaceLinks}
        navigationLabel="Client portal navigation"
        title={pwaSurfaceDefinitions.client.name}
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
