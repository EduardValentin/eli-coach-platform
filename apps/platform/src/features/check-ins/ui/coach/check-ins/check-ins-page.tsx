import { useCalendarDayTimeZone } from "@eli-coach-platform/ui/lib";
import { PortalPageHeader } from "@eli-coach-platform/ui/portal";
import { Button } from "@eli-coach-platform/ui/primitives";
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
import { useCheckInAnswers } from "~/features/check-ins/ui/shared/check-ins/use-check-in-answers";

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
    description: "Requests from your clients show up here.",
  },
  past: {
    icon: Clock,
    title: "No past check-ins yet",
    description: "Passed and cancelled check-ins show up here.",
  },
};

export default function CoachCheckInsRoute() {
  const { checkIns } = useLoaderData<typeof loader>();
  const timeZone = useCalendarDayTimeZone();
  const answers = useCheckInAnswers();

  return (
    <div className="w-full" data-parity-root="CoachCheckins">
      <PortalPageHeader
        subtitle="Manage all client check-ins in one place."
        title="Check-ins"
      />

      <CheckInListing
        checkIns={checkIns}
        defaultTab="requests"
        emptyCopy={EMPTY_COPY}
        renderCheckIn={(checkIn, tab) => (
          <CheckInRow
            actions={coachActionsFor(checkIn, tab, answers)}
            attendee={{ name: fullNameOf(checkIn) }}
            checkIn={checkIn}
            timeZone={timeZone}
            viewer={{
              counterpartName: checkIn.client.firstName,
              party: "coach",
            }}
          />
        )}
        viewer="coach"
      />

      {answers.outcomes}
    </div>
  );
}

type CheckInAnswers = ReturnType<typeof useCheckInAnswers>;

function coachActionsFor(
  checkIn: CoachCheckIn,
  tab: CheckInTab,
  answers: CheckInAnswers,
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

  if (tab === "requests" && checkIn.proposedBy === "client") {
    return <RequestAnswers answers={answers} checkIn={checkIn} />;
  }

  return undefined;
}

function RequestAnswers({
  answers,
  checkIn,
}: {
  answers: CheckInAnswers;
  checkIn: CoachCheckIn;
}) {
  const answering = answers.answering(checkIn.id);

  return (
    <>
      <Button
        aria-busy={answering === "decline" || undefined}
        disabled={answering !== null}
        onClick={() =>
          answers.answer({
            checkInId: checkIn.id,
            kind: "decline",
            success: "Check-in declined",
          })
        }
        size="xs"
        variant="ghost"
      >
        {answers.labelFor(checkIn.id, { kind: "decline", label: "Decline" })}
      </Button>
      <Button
        aria-busy={answering === "approve" || undefined}
        disabled={answering !== null}
        onClick={() =>
          answers.answer({
            checkInId: checkIn.id,
            kind: "approve",
            success: `Approved check-in with ${fullNameOf(checkIn)}`,
          })
        }
        size="xs"
      >
        {answers.labelFor(checkIn.id, { kind: "approve", label: "Approve" })}
      </Button>
    </>
  );
}

function fullNameOf(checkIn: CoachCheckIn): string {
  return `${checkIn.client.firstName} ${checkIn.client.lastName}`.trim();
}
