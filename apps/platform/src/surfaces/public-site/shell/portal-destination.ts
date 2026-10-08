import type { AccountRole } from "@eli-coach-platform/domain/account";

import type { PortalDestination } from "~/features/accounts/public/account";
import { PORTAL_PATH_BY_ROLE } from "~/features/accounts/public/paths";
import {
  clientJourneyPortalLink,
  type ClientPortalStanding,
} from "~/features/coaching-sales/public/client-journey";

const PORTAL_DESTINATION_BY_ROLE: Record<AccountRole, PortalDestination> = {
  CLIENT: { href: PORTAL_PATH_BY_ROLE.CLIENT, label: "Client Portal" },
  COACH: { href: PORTAL_PATH_BY_ROLE.COACH, label: "Coach Portal" },
};

type SignedInPosition = {
  standing: ClientPortalStanding | null;
  role: AccountRole;
};

export function resolvePortalDestination(
  position: SignedInPosition,
): PortalDestination {
  const roleDestination = PORTAL_DESTINATION_BY_ROLE[position.role];

  if (position.role !== "CLIENT" || !position.standing) {
    return roleDestination;
  }

  return clientJourneyPortalLink(position.standing) ?? roleDestination;
}
