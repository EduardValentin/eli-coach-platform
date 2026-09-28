import type { AccountRole } from "@eli-coach-platform/domain/account";
import type { ClientJourneyStep } from "@eli-coach-platform/domain/client-journey";

import type { PortalDestination } from "~/features/accounts/contracts/account";
import { PORTAL_PATH_BY_ROLE } from "~/features/accounts/contracts/paths";
import {
  clientJourneyDestination,
  FINISH_ONBOARDING_LABEL,
} from "~/features/coaching-sales/contracts/client-journey";

const PORTAL_DESTINATION_BY_ROLE: Record<AccountRole, PortalDestination> = {
  CLIENT: { href: PORTAL_PATH_BY_ROLE.CLIENT, label: "Client Portal" },
  COACH: { href: PORTAL_PATH_BY_ROLE.COACH, label: "Coach Portal" },
};

type SignedInPosition = {
  journeyStep: ClientJourneyStep | null;
  role: AccountRole;
};

export function resolvePortalDestination(
  position: SignedInPosition,
): PortalDestination {
  if (position.role === "CLIENT" && position.journeyStep) {
    return {
      href: clientJourneyDestination(position.journeyStep),
      label: FINISH_ONBOARDING_LABEL,
    };
  }

  return PORTAL_DESTINATION_BY_ROLE[position.role];
}
