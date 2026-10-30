import type { PortalDestination } from "~/bounded-contexts/access/accounts/public/account";
import type { AccountRole } from "~/bounded-contexts/access/public/session";
import { PORTAL_PATH_BY_ROLE } from "~/bounded-contexts/access/public/paths";
import {
  clientJourneyPortalLink,
  type ClientPortalStanding,
} from "~/bounded-contexts/clients/clients/public/client-journey";

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
