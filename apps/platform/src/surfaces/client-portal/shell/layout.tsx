import { createPwaRegistration, pwaSurfaceDefinitions } from "@eli-coach-platform/infrastructure/pwa";
import { SidebarSurfaceLayout } from "@eli-coach-platform/ui";
import {
  isRouteErrorResponse,
  Outlet,
  useRouteError,
  type LinksFunction,
  type MetaFunction,
} from "react-router";

import {
  AccessDeniedPage,
  type AccessDeniedRecovery,
} from "~/features/accounts/ui/shared/access-denied-page";

import { clientSurfaceLinks } from "./navigation-links";
import { loader } from "./layout.server";

export { loader };

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

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 403) {
    return <AccessDeniedPage recovery={resolveRecovery(error.data)} />;
  }

  // Not a wrong-portal denial — root.tsx's own ErrorBoundary already covers
  // every other case (404, unexpected errors), so re-throwing hands the error
  // to the nearest ancestor boundary that defines one instead of duplicating
  // that handling here.
  throw error;
}

function resolveRecovery(data: unknown): AccessDeniedRecovery {
  const recovery = (data as { recovery?: unknown } | undefined)?.recovery;

  return recovery === "store" || recovery === "client-portal" || recovery === "coach-portal"
    ? recovery
    : "anonymous";
}
