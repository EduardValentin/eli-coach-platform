import {
  createPwaRegistration,
  pwaSurfaceDefinitions,
} from "@eli-coach-platform/infrastructure/pwa";
import { PortalShell } from "@eli-coach-platform/ui/layout";
import { Button } from "@eli-coach-platform/ui/primitives";
import { LogOut } from "lucide-react";
import {
  Outlet,
  useLoaderData,
  type LinksFunction,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import { SignOutControl } from "~/features/accounts/ui/shared/sign-out-control";
import { coachingSalesContext } from "~/features/coaching-sales/server/guards/coaching-sales-context.server";

import {
  presentClientIdentity,
  type ClientShellPresentation,
} from "./client-identity-presentation";
import { ClientNameBlock } from "./client-name-block";
import { clientSurfaceLinks, clientTabLinks } from "./navigation-links";

const pwaRegistration = createPwaRegistration({
  assetBasePath: import.meta.env.BASE_URL,
  surface: "client",
});

export function loader(args: LoaderFunctionArgs): ClientShellPresentation {
  return presentClientIdentity(
    args.context.get(coachingSalesContext).clientJourney.loadIdentity(args),
  );
}

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
  const presentation = useLoaderData<typeof loader>();
  const { displayName } = presentation;

  return (
    <>
      <PortalShell
        asideLabel="Client portal sidebar"
        brand={<ClientNameBlock displayName={displayName} size="md" />}
        links={clientSurfaceLinks}
        mobileNavigation={{
          kind: "tabs",
          sheet: {
            footer: (
              <SignOutControl redirectUrl="/">
                <Button
                  data-parity="sheet-sign-out"
                  variant="ghost-muted"
                  className="w-full"
                >
                  <LogOut aria-hidden="true" size={16} />
                  Sign out
                </Button>
              </SignOutControl>
            ),
            header: <ClientNameBlock displayName={displayName} size="md" />,
            navigationLabel: "Client portal more",
            title: "More",
          },
          tabs: clientTabLinks,
          tabsLabel: "Client portal tabs",
        }}
        navigationLabel="Client portal navigation"
        topBarBrand={<ClientNameBlock displayName={displayName} size="sm" />}
        topBarLabel="Client portal top bar"
      >
        <Outlet context={presentation} />
      </PortalShell>
      <script
        dangerouslySetInnerHTML={{
          __html: pwaRegistration.registrationScript,
        }}
      />
    </>
  );
}
