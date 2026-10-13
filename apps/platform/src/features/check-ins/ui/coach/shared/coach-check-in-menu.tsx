import { useCalendarDayTimeZone } from "@eli-coach-platform/ui/lib";

import type { CoachCheckIn } from "~/features/check-ins/public/check-ins";
import {
  CheckInDecisionOutcomes,
  useCheckInDecisions,
} from "~/features/check-ins/ui/shared/check-ins/check-in-decisions";
import {
  CheckInMenuDialogs,
  useCheckInMenu,
  type CheckInMenuWording,
} from "~/features/check-ins/ui/shared/check-ins/check-in-menu";

const MENU_WORDING: CheckInMenuWording<CoachCheckIn> = {
  cancellationOf: (checkIn, dayAndTime) => ({
    description: `${dayAndTime} with ${fullNameOf(checkIn)}.`,
    successMessage: `Cancelled check-in with ${fullNameOf(checkIn)}`,
  }),
  proposerOf: (checkIn) => ({
    noteLabel: `Add a note for ${checkIn.client.firstName} (optional)`,
    openTimesQuery: { clientId: checkIn.clientId },
  }),
};

export function useCoachCheckInMenu() {
  const timeZone = useCalendarDayTimeZone();
  const decisions = useCheckInDecisions();
  const menu = useCheckInMenu<CoachCheckIn>(decisions);

  return {
    decisions,
    dialogs: (
      <>
        <CheckInMenuDialogs
          decisions={decisions}
          menu={menu}
          timeZone={timeZone}
          wording={MENU_WORDING}
        />
        <CheckInDecisionOutcomes decisions={decisions} />
      </>
    ),
    menuOf: menu.menuOf,
  };
}

export function fullNameOf(checkIn: CoachCheckIn): string {
  return `${checkIn.client.firstName} ${checkIn.client.lastName}`.trim();
}
