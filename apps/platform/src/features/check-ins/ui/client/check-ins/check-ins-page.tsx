import { joinBasePath } from "@eli-coach-platform/config";
import {
  COACH_DISPLAY_NAME,
  ELI_PORTRAIT_PATHS,
} from "@eli-coach-platform/content";
import { pwaSurfaceDefinitions } from "@eli-coach-platform/infrastructure/pwa";
import { useCalendarDayTimeZone } from "@eli-coach-platform/ui/lib";
import { PortalPageHeader } from "@eli-coach-platform/ui/portal";
import { Button, DisabledActionHint } from "@eli-coach-platform/ui/primitives";
import { toast } from "@eli-coach-platform/ui/toast";
import { CalendarDays, CalendarPlus, Clock } from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  useLoaderData,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import { formatShortDay } from "~/features/assessment-calls/public/call-moment";
import type { ClientCheckIns } from "~/features/check-ins/public/check-ins";
import { clientCheckInJoinPath } from "~/features/check-ins/public/paths";
import { checkInsContext } from "~/features/check-ins/server/guards/check-ins-context.server";
import {
  CheckInListing,
  type CheckInEmptyCopy,
  type CheckInTab,
  type ListedCheckIn,
} from "~/features/check-ins/ui/shared/check-ins/check-in-listing";
import {
  CheckInRow,
  type CheckInViewer,
} from "~/features/check-ins/ui/shared/check-ins/check-in-row";
import { JoinMeetLink } from "~/features/check-ins/ui/shared/check-ins/join-meet-link";
import {
  CheckInDecisionButton,
  CheckInDecisionOutcomes,
  useCheckInDecisions,
  type CheckInDecisions,
} from "~/features/check-ins/ui/shared/check-ins/check-in-decisions";

import { CheckInRequestDialog } from "./check-in-request-dialog";

export function loader(args: LoaderFunctionArgs): Promise<ClientCheckIns> {
  return args.context.get(checkInsContext).clientCheckIns.loadCheckIns(args);
}

export const meta: MetaFunction = () => [
  { title: "Check-ins | Evoa" },
  { name: "description", content: pwaSurfaceDefinitions.client.description },
  { name: "theme-color", content: pwaSurfaceDefinitions.client.themeColor },
];

const EMPTY_COPY: Record<CheckInTab, CheckInEmptyCopy> = {
  upcoming: {
    icon: CalendarDays,
    title: "No upcoming check-ins",
    description: "Request one any time using the button above.",
  },
  requests: {
    icon: CalendarPlus,
    title: "No open requests",
    description: "Requests you send show up here.",
  },
  past: {
    icon: Clock,
    title: "No past check-ins yet",
    description: "Passed and cancelled check-ins will appear here.",
  },
};

const WAITING_REQUEST_REASON =
  "You can send another request once this one is answered.";

const VIEWER: CheckInViewer = {
  counterpartName: "your coach",
  party: "client",
};

const COACH = {
  imageUrl: joinBasePath(import.meta.env.BASE_URL, ELI_PORTRAIT_PATHS.small),
  name: COACH_DISPLAY_NAME,
};

export default function ClientCheckInsRoute() {
  const { checkIns } = useLoaderData<typeof loader>();
  const timeZone = useCalendarDayTimeZone();
  const decisions = useCheckInDecisions();
  const [requesting, setRequesting] = useState(false);
  const [openings, setOpenings] = useState(0);
  const hasWaitingRequest = checkIns.some(
    (checkIn) => checkIn.isWaitingRequest,
  );
  const requestButton = (className: string) => {
    const button = (
      <Button
        className={className}
        onClick={() => {
          setOpenings((count) => count + 1);
          setRequesting(true);
        }}
      >
        <CalendarPlus aria-hidden="true" size={16} />
        Request check-in
      </Button>
    );

    return hasWaitingRequest ? (
      <DisabledActionHint reason={WAITING_REQUEST_REASON}>
        {button}
      </DisabledActionHint>
    ) : (
      button
    );
  };

  return (
    <div className="w-full" data-parity-root="ClientCheckins">
      <PortalPageHeader
        actions={requestButton("hidden sm:inline-flex")}
        subtitle="Request a check-in and look back at past sessions."
        title="Check-ins"
      />

      <CheckInListing
        checkIns={checkIns}
        defaultTab="upcoming"
        emptyCopy={EMPTY_COPY}
        renderCheckIn={(checkIn, tab) => (
          <CheckInRow
            actions={clientActionsFor(checkIn, tab, decisions)}
            attendee={COACH}
            checkIn={checkIn}
            timeZone={timeZone}
            viewer={VIEWER}
          />
        )}
      />

      <CheckInRequestDialog
        key={openings}
        onOpenChange={setRequesting}
        onRequested={(startsAt) =>
          toast.success(
            `Check-in requested for ${formatShortDay(new Date(startsAt), timeZone)}`,
          )
        }
        open={requesting}
        timeZone={timeZone}
      />

      <CheckInDecisionOutcomes decisions={decisions} />

      {requestButton(
        "fixed bottom-(--portal-tab-bar-clearance) left-4 z-40 shadow-action-hover sm:hidden",
      )}
    </div>
  );
}

function clientActionsFor(
  checkIn: ListedCheckIn,
  tab: CheckInTab,
  decisions: CheckInDecisions,
): ReactNode | undefined {
  if (tab === "upcoming") {
    return (
      <JoinMeetLink checkIn={checkIn} to={clientCheckInJoinPath(checkIn.id)} />
    );
  }

  if (checkIn.viewerMayWithdraw) {
    return (
      <CheckInDecisionButton
        decision={{
          checkInId: checkIn.id,
          kind: "withdraw",
          successMessage: "Request cancelled",
        }}
        decisions={decisions}
        label="Cancel request"
        size="sm"
        variant="outline"
      />
    );
  }

  return undefined;
}
