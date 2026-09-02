import { PortalShell } from "@eli-coach-platform/ui";
import { Dumbbell } from "lucide-react";
import { Outlet, type MetaFunction } from "react-router";

import { coachSurfaceLinks } from "./navigation-links";

export { middleware } from "./layout.server";

const COACH_PORTAL_TITLE = "Coach Portal | Evoa";
const COACH_PORTAL_DESCRIPTION =
  "Coach-facing workspace for client management, planning, scheduling, and communication.";
const COACH_PORTAL_THEME_COLOR = "#17212f";

export const meta: MetaFunction = () => [
  { title: COACH_PORTAL_TITLE },
  {
    name: "description",
    content: COACH_PORTAL_DESCRIPTION,
  },
  {
    name: "theme-color",
    content: COACH_PORTAL_THEME_COLOR,
  },
];

// Non-navigating: the prototype links this block to a coach profile page
// that is out of MVP scope.
function CoachBrand() {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-text-primary text-text-inverted shadow-raised">
        <Dumbbell aria-hidden="true" className="-rotate-45" size={20} />
      </div>
      <div className="min-w-0">
        <p className="font-heading text-body-lg font-semibold text-text-primary">
          Evoa
        </p>
        <p className="text-count-badge font-semibold uppercase tracking-widest text-brand-primary">
          Coach Portal
        </p>
      </div>
    </div>
  );
}

function CoachTopBarBrand() {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-text-primary text-text-inverted">
        <Dumbbell aria-hidden="true" className="-rotate-45" size={16} />
      </div>
      <span className="font-heading text-body-sm font-semibold text-text-primary">
        Coach Portal
      </span>
    </div>
  );
}

export default function CoachLayoutRoute() {
  return (
    <PortalShell
      asideLabel="Coach portal sidebar"
      brand={<CoachBrand />}
      links={coachSurfaceLinks}
      mobileNavigationLabel="Coach portal mobile navigation"
      navigationLabel="Coach portal navigation"
      topBarBrand={<CoachTopBarBrand />}
    >
      <Outlet />
    </PortalShell>
  );
}
