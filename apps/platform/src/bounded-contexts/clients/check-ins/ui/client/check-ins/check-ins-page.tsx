import { joinBasePath } from "~/shared/http/base-path";
import { COACH_DISPLAY_NAME, ELI_PORTRAIT_PATHS } from "~/shared/brand";
import { pwaSurfaceDefinitions } from "~/shared/pwa";
import { useCalendarDayTimeZone } from "~/shared/design-system/lib";
import { PortalPageHeader } from "~/shared/design-system/portal";
import { Button, DisabledActionHint } from "~/shared/design-system/primitives";
import { toast } from "~/shared/design-system/toast";
import { CalendarDays, CalendarPlus, Clock } from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  useLoaderData,
  type LoaderFunctionArgs,
  type MetaFunction,
  type ShouldRevalidateFunction,
} from "react-router";

import { formatShortDay } from "~/bounded-contexts/scheduling/assessment-calls/public/call-moment";
import type { ClientCheckIns } from "~/bounded-contexts/clients/check-ins/public/check-ins";
import { clientCheckInJoinPath } from "~/bounded-contexts/clients/check-ins/public/paths";
import { checkInsContext } from "~/bounded-contexts/clients/check-ins/adapters/inbound/http/context.server";
import {
  CheckInListing,
  type CheckInEmptyCopy,
} from "~/bounded-contexts/clients/check-ins/ui/shared/check-ins/check-in-listing";
import {
  shouldReloadCheckIns,
  type CheckInTab,
  type ListedCheckIn,
} from "~/bounded-contexts/clients/check-ins/ui/shared/check-ins/check-in-listing-rules";
import {
  CheckInRow,
  type CheckInViewer,
} from "~/bounded-contexts/clients/check-ins/ui/shared/check-ins/check-in-row";
import { JoinMeetLink } from "~/bounded-contexts/clients/check-ins/ui/shared/check-ins/join-meet-link";
import {
  CheckInAnswers,
  CheckInDecisionOutcomes,
  CheckInWithdrawal,
  useCheckInDecisions,
  type CheckInDecisions,
} from "~/bounded-contexts/clients/check-ins/ui/shared/check-ins/check-in-decisions";
import {
  CheckInMenuDialogs,
  useCheckInMenu,
  type CheckInMenuWording,
} from "~/bounded-contexts/clients/check-ins/ui/shared/check-ins/check-in-menu";

import { CheckInRequestDialog } from "./check-in-request-dialog";

export function loader(args: LoaderFunctionArgs): Promise<ClientCheckIns> {
  return args.context.get(checkInsContext).clientCheckIns.loadCheckIns(args);
}

export const meta: MetaFunction = () => [
  { title: "Check-ins | Evoa" },
  { name: "description", content: pwaSurfaceDefinitions.client.description },
  { name: "theme-color", content: pwaSurfaceDefinitions.client.themeColor },
];

export const shouldRevalidate: ShouldRevalidateFunction = shouldReloadCheckIns;

const EMPTY_COPY: Record<CheckInTab, CheckInEmptyCopy> = {
  upcoming: {
    icon: CalendarDays,
    title: "No upcoming check-ins",
    description: "Request one any time using the button above.",
  },
  requests: {
    icon: CalendarPlus,
    title: "No open requests",
    description:
      "Requests you send and proposals from your coach show up here.",
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
  const decisions = useCheckInDecisions({ timeZone });
  const menu = useCheckInMenu<ListedCheckIn>(decisions);
  const [requesting, setRequesting] = useState(false);
  const [openings, setOpenings] = useState(0);
  const hasWaitingRequest = checkIns.some(
    (checkIn) => checkIn.isWaitingRequest,
  );
  const renderRequestButton = (className: string) => {
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
    <div className="w-full pb-16 sm:pb-0" data-parity-root="ClientCheckins">
      <PortalPageHeader
        actions={renderRequestButton("hidden sm:inline-flex")}
        subtitle="Request a check-in, answer proposals, and look back at past sessions."
        title="Check-ins"
      />

      <CheckInListing
        checkIns={checkIns}
        emptyCopy={EMPTY_COPY}
        renderCheckIn={(checkIn, tab) => (
          <CheckInRow
            actions={clientActionsFor(checkIn, tab, decisions)}
            attendee={COACH}
            checkIn={checkIn}
            menu={menu.menuOf(checkIn)}
            timeZone={timeZone}
            viewer={VIEWER}
          />
        )}
        waitingForLabel="Waiting for your coach"
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

      <CheckInMenuDialogs
        decisions={decisions}
        menu={menu}
        timeZone={timeZone}
        wording={menuWordingIn(timeZone)}
      />

      <CheckInDecisionOutcomes decisions={decisions} />

      {renderRequestButton(
        "fixed bottom-(--portal-tab-bar-clearance) left-4 z-40 shadow-action-hover sm:hidden",
      )}
    </div>
  );
}

function menuWordingIn(timeZone: string): CheckInMenuWording<ListedCheckIn> {
  return {
    cancellationOf: (_checkIn, dayAndTime) => ({
      description: `${dayAndTime}.`,
      successMessage: "Check-in cancelled",
    }),
    proposerOf: () => ({
      clientTimeZone: timeZone,
      noteLabel: "Add a note for your coach",
    }),
  };
}

function clientActionsFor(
  checkIn: ListedCheckIn,
  tab: CheckInTab,
  decisions: CheckInDecisions,
): ReactNode | undefined {
  if (checkIn.status === "clash") {
    return undefined;
  }

  if (tab === "upcoming") {
    return (
      <JoinMeetLink checkIn={checkIn} to={clientCheckInJoinPath(checkIn.id)} />
    );
  }

  if (checkIn.awaitsViewer) {
    return (
      <CheckInAnswers
        approvedMessage="Check-in approved"
        checkIn={checkIn}
        decisions={decisions}
        size="sm"
      />
    );
  }

  if (checkIn.viewerMayWithdraw) {
    return (
      <CheckInWithdrawal
        checkInId={checkIn.id}
        decisions={decisions}
        size="sm"
      />
    );
  }

  return undefined;
}
