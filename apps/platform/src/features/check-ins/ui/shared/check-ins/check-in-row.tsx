import {
  AppointmentCard,
  type AppointmentAttendee,
} from "@eli-coach-platform/ui/appointments";
import { Badge } from "@eli-coach-platform/ui/primitives";
import type { ReactNode } from "react";

import {
  formatClockTime,
  formatShortDay,
} from "~/features/assessment-calls/public/call-moment";

import type { CheckInParty, ListedCheckIn } from "./check-in-listing";

export type CheckInViewer = {
  counterpartName: string;
  party: CheckInParty;
};

type CheckInRowProps = {
  actions?: ReactNode;
  attendee: AppointmentAttendee;
  checkIn: ListedCheckIn;
  timeZone: string;
  viewer: CheckInViewer;
};

const KIND_LABELS: Record<ListedCheckIn["kind"], string> = {
  ad_hoc: "Ad-hoc",
};

export function CheckInRow({
  actions,
  attendee,
  checkIn,
  timeZone,
  viewer,
}: CheckInRowProps) {
  const startsAt = new Date(checkIn.startsAt);
  const requester = nameFor(checkIn.initiatedBy, viewer);
  const isOver = checkIn.status === "passed" || checkIn.status === "cancelled";

  return (
    <AppointmentCard
      actions={
        actions && (
          <div className="flex w-full items-center gap-2 md:w-auto">
            <div className="flex flex-1 gap-2 *:flex-1 md:flex-none md:*:flex-none">
              {actions}
            </div>
          </div>
        )
      }
      attendee={attendee}
      badges={
        checkIn.status === "cancelled" ? (
          <Badge tone="muted">Cancelled</Badge>
        ) : undefined
      }
      parityRoot="CheckinCard"
      quote={checkIn.note ?? undefined}
      quoteAuthor={checkIn.note ? capitalized(requester) : undefined}
      quoteParity="checkin-note"
      status={isOver ? "past" : "scheduled"}
      when={{
        date: formatShortDay(startsAt, timeZone),
        time: formatClockTime(startsAt, timeZone),
      }}
      whenLabel={`${KIND_LABELS[checkIn.kind]} · Requested by ${requester}`}
    />
  );
}

function nameFor(party: CheckInParty, viewer: CheckInViewer): string {
  return party === viewer.party ? "you" : viewer.counterpartName;
}

function capitalized(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
