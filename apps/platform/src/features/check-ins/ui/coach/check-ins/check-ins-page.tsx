import { useCalendarDayTimeZone } from "@eli-coach-platform/ui/lib";
import { PortalPageHeader } from "@eli-coach-platform/ui/portal";
import { CalendarDays, CalendarPlus, Clock } from "lucide-react";
import type { ReactNode } from "react";
import {
  useLoaderData,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import type {
  CoachCheckIn,
  CoachCheckIns,
} from "~/features/check-ins/public/check-ins";
import { coachCheckInJoinPath } from "~/features/check-ins/public/paths";
import { checkInsContext } from "~/features/check-ins/server/guards/check-ins-context.server";
import {
  CheckInListing,
  type CheckInEmptyCopy,
  type CheckInTab,
} from "~/features/check-ins/ui/shared/check-ins/check-in-listing";
import { CheckInRow } from "~/features/check-ins/ui/shared/check-ins/check-in-row";
import { JoinMeetLink } from "~/features/check-ins/ui/shared/check-ins/join-meet-link";
import {
  CheckInAnswers,
  CheckInDecisionOutcomes,
  CheckInWithdrawal,
  useCheckInDecisions,
  type CheckInDecisions,
} from "~/features/check-ins/ui/shared/check-ins/check-in-decisions";
import {
  CheckInMenuDialogs,
  useCheckInMenu,
  type CheckInMenuWording,
} from "~/features/check-ins/ui/shared/check-ins/check-in-menu";
import { clientFullName } from "~/features/clients/public/clients";

export function loader(args: LoaderFunctionArgs): Promise<CoachCheckIns> {
  return args.context.get(checkInsContext).coachCheckIns.loadCheckIns(args);
}

export const meta: MetaFunction = () => [{ title: "Check-ins | Evoa" }];

const EMPTY_COPY: Record<CheckInTab, CheckInEmptyCopy> = {
  upcoming: {
    icon: CalendarDays,
    title: "No upcoming check-ins",
    description: "Approved check-ins with your clients show up here.",
  },
  requests: {
    icon: CalendarPlus,
    title: "No open requests",
    description:
      "Requests from your clients and the ones you send show up here.",
  },
  past: {
    icon: Clock,
    title: "No past check-ins yet",
    description: "Passed and cancelled check-ins show up here.",
  },
};

const MENU_WORDING: CheckInMenuWording<CoachCheckIn> = {
  cancellationOf: (checkIn, dayAndTime) => ({
    description: `${dayAndTime} with ${clientFullName(checkIn.client)}.`,
    successMessage: `Cancelled check-in with ${clientFullName(checkIn.client)}`,
  }),
  proposerOf: (checkIn) => ({
    noteLabel: `Add a note for ${checkIn.client.firstName} (optional)`,
    openTimesQuery: { clientId: checkIn.clientId },
  }),
};

export default function CoachCheckInsRoute() {
  const { checkIns } = useLoaderData<typeof loader>();
  const timeZone = useCalendarDayTimeZone();
  const decisions = useCheckInDecisions();
  const menu = useCheckInMenu<CoachCheckIn>(decisions);

  return (
    <div className="w-full" data-parity-root="CoachCheckins">
      <PortalPageHeader
        subtitle="Manage all client check-ins in one place."
        title="Check-ins"
      />

      <CheckInListing
        checkIns={checkIns}
        emptyCopy={EMPTY_COPY}
        renderCheckIn={(checkIn, tab) => (
          <CheckInRow
            actions={coachActionsFor(checkIn, tab, decisions)}
            attendee={{ name: clientFullName(checkIn.client) }}
            checkIn={checkIn}
            menu={menu.menuOf(checkIn)}
            menuSize="xs"
            timeZone={timeZone}
            viewer={{
              counterpartName: checkIn.client.firstName,
              party: "coach",
            }}
          />
        )}
      />

      <CheckInMenuDialogs
        decisions={decisions}
        menu={menu}
        timeZone={timeZone}
        wording={MENU_WORDING}
      />
      <CheckInDecisionOutcomes decisions={decisions} />
    </div>
  );
}

function coachActionsFor(
  checkIn: CoachCheckIn,
  tab: CheckInTab,
  decisions: CheckInDecisions,
): ReactNode | undefined {
  if (tab === "upcoming") {
    return (
      <JoinMeetLink
        checkIn={checkIn}
        size="xs"
        to={coachCheckInJoinPath(checkIn.id)}
      />
    );
  }

  if (checkIn.status === "clash") {
    return undefined;
  }

  if (checkIn.awaitsViewer) {
    return (
      <CheckInAnswers
        approvedMessage={`Approved check-in with ${clientFullName(checkIn.client)}`}
        checkIn={checkIn}
        decisions={decisions}
        size="xs"
      />
    );
  }

  if (checkIn.viewerMayWithdraw) {
    return (
      <CheckInWithdrawal
        checkInId={checkIn.id}
        decisions={decisions}
        size="xs"
      />
    );
  }

  return undefined;
}
