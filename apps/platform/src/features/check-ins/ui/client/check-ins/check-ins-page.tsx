import { joinBasePath } from "@eli-coach-platform/config";
import {
  COACH_DISPLAY_NAME,
  ELI_PORTRAIT_PATHS,
} from "@eli-coach-platform/content";
import { pwaSurfaceDefinitions } from "@eli-coach-platform/infrastructure/pwa";
import { useCalendarDayTimeZone } from "@eli-coach-platform/ui/lib";
import { PortalPageHeader } from "@eli-coach-platform/ui/portal";
import { Button } from "@eli-coach-platform/ui/primitives";
import { toast } from "@eli-coach-platform/ui/toast";
import { CalendarDays, CalendarPlus, Clock } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
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
import { useCheckInAnswers } from "~/features/check-ins/ui/shared/check-ins/use-check-in-answers";

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
  const answers = useCheckInAnswers();
  const [requesting, setRequesting] = useState(false);
  const [openings, setOpenings] = useState(0);
  const openRequestNoteId = useId();
  const openRequest = checkIns.some(
    (checkIn) =>
      checkIn.status === "pending" && checkIn.initiatedBy === "client",
  );
  const requestButton = {
    "aria-describedby": openRequest ? openRequestNoteId : undefined,
    disabled: openRequest,
    onClick: () => {
      setOpenings((count) => count + 1);
      setRequesting(true);
    },
  };

  return (
    <div className="w-full" data-parity-root="ClientCheckins">
      <PortalPageHeader
        actions={
          <div className="flex flex-col gap-2 sm:items-end">
            <Button {...requestButton} className="hidden sm:inline-flex">
              <CalendarPlus aria-hidden="true" size={16} />
              Request check-in
            </Button>
            {openRequest && (
              <p
                className="text-xs text-text-secondary sm:text-right"
                id={openRequestNoteId}
              >
                You can send another request once this one is answered.
              </p>
            )}
          </div>
        }
        subtitle="Request a check-in and look back at past sessions."
        title="Check-ins"
      />

      <CheckInListing
        checkIns={checkIns}
        defaultTab="upcoming"
        emptyCopy={EMPTY_COPY}
        renderCheckIn={(checkIn, tab) => (
          <CheckInRow
            actions={clientActionsFor(checkIn, tab, answers)}
            attendee={COACH}
            checkIn={checkIn}
            timeZone={timeZone}
            viewer={VIEWER}
          />
        )}
        viewer="client"
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

      {answers.outcomes}

      <Button
        {...requestButton}
        aria-label="Request a check-in"
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-4 z-40 shadow-action-hover sm:hidden"
      >
        <CalendarPlus aria-hidden="true" size={16} />
        Request check-in
      </Button>
    </div>
  );
}

type CheckInAnswers = ReturnType<typeof useCheckInAnswers>;

function clientActionsFor(
  checkIn: ListedCheckIn,
  tab: CheckInTab,
  answers: CheckInAnswers,
): ReactNode | undefined {
  if (tab === "upcoming") {
    return (
      <JoinMeetLink checkIn={checkIn} to={clientCheckInJoinPath(checkIn.id)} />
    );
  }

  if (tab === "requests" && checkIn.proposedBy === "client") {
    return <CancelRequestButton answers={answers} checkInId={checkIn.id} />;
  }

  return undefined;
}

function CancelRequestButton({
  answers,
  checkInId,
}: {
  answers: CheckInAnswers;
  checkInId: string;
}) {
  const answering = answers.answering(checkInId);

  return (
    <Button
      aria-busy={answering === "withdraw" || undefined}
      disabled={answering !== null}
      onClick={() =>
        answers.answer({
          checkInId,
          kind: "withdraw",
          success: "Request cancelled",
        })
      }
      size="sm"
      variant="outline"
    >
      {answers.labelFor(checkInId, {
        kind: "withdraw",
        label: "Cancel request",
      })}
    </Button>
  );
}
