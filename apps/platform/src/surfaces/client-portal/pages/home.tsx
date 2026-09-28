import { PortalPageHeader } from "@eli-coach-platform/ui/portal";
import { useOutletContext, type MetaFunction } from "react-router";

import type { ClientShellPresentation } from "~/surfaces/client-portal/shell/client-identity-presentation";

export const meta: MetaFunction = () => [{ title: "Dashboard | Evoa" }];

export default function ClientHomeRoute() {
  const { greeting } = useOutletContext<ClientShellPresentation>();

  return (
    <div className="w-full">
      <div data-parity-root="ClientGreeting">
        <PortalPageHeader
          subtitle={
            <span data-parity="subtitle">
              Here is your daily snapshot and current focus.
            </span>
          }
          title={<span data-parity="greeting">{greeting}</span>}
        />
      </div>
    </div>
  );
}
