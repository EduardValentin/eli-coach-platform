import {
  AppointmentCard,
  type AppointmentAttendee,
} from "@eli-coach-platform/ui/appointments";
import {
  Badge,
  RowActionsMenu,
  type RowMenuAction,
} from "@eli-coach-platform/ui/primitives";
import type { ReactNode } from "react";

import {
  formatClockTime,
  formatShortDay,
} from "~/features/assessment-calls/public/call-moment";

import {
  hasPendingNewTime,
  type CheckInParty,
  type ListedCheckIn,
} from "./check-in-listing";

export type CheckInViewer = {
  counterpartName: string;
  party: CheckInParty;
};

type CheckInRowProps = {
  actions?: ReactNode;
  attendee: AppointmentAttendee;
  checkIn: ListedCheckIn;
  menu: readonly RowMenuAction[];
  menuSize?: "xs" | "sm";
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
  menu,
  menuSize,
  timeZone,
  viewer,
}: CheckInRowProps) {
  const when = appointmentTimeOf(new Date(checkIn.startsAt), timeZone);
  const newTimeWaits = hasPendingNewTime(checkIn);
  const earlierWhen =
    checkIn.earlierStartsAt === null
      ? undefined
      : appointmentTimeOf(new Date(checkIn.earlierStartsAt), timeZone);
  const isOver = checkIn.status === "passed" || checkIn.status === "cancelled";
  const shownNote = noteOf(checkIn);
  const hasActions = actions !== undefined || menu.length > 0;

  return (
    <AppointmentCard
      actions={
        hasActions ? (
          <div className="flex w-full items-center gap-2 md:w-auto">
            {actions && (
              <div className="flex flex-1 gap-2 *:flex-1 md:flex-none md:*:flex-none">
                {actions}
              </div>
            )}
            <RowActionsMenu
              actions={menu}
              label={`More actions for the check-in on ${when.date} at ${when.time}`}
              size={menuSize}
            />
          </div>
        ) : undefined
      }
      attendee={attendee}
      badges={
        checkIn.status === "cancelled" ? (
          <Badge tone="muted">Cancelled</Badge>
        ) : undefined
      }
      parity="checkin-card-body"
      parityRoot="CheckinCard"
      quote={shownNote?.text}
      quoteAuthor={shownNote && capitalized(nameFor(shownNote.by, viewer))}
      quoteParity="checkin-note"
      rescheduledFrom={newTimeWaits ? undefined : earlierWhen}
      status={isOver ? "past" : "scheduled"}
      supersededWhen={newTimeWaits ? earlierWhen : undefined}
      when={when}
      whenLabel={`${KIND_LABELS[checkIn.kind]} · ${moveLabelOf(checkIn, viewer)}`}
    />
  );
}

function appointmentTimeOf(instant: Date, timeZone: string) {
  return {
    date: formatShortDay(instant, timeZone),
    time: formatClockTime(instant, timeZone),
  };
}

function moveLabelOf(checkIn: ListedCheckIn, viewer: CheckInViewer): string {
  return hasPendingNewTime(checkIn)
    ? `New time from ${nameFor(checkIn.proposedBy, viewer)}`
    : `Requested by ${nameFor(checkIn.initiatedBy, viewer)}`;
}

function noteOf(
  checkIn: ListedCheckIn,
): { by: CheckInParty; text: string } | undefined {
  if (checkIn.newTimeNote) {
    return { by: checkIn.proposedBy, text: checkIn.newTimeNote };
  }

  return checkIn.note
    ? { by: checkIn.initiatedBy, text: checkIn.note }
    : undefined;
}

function nameFor(party: CheckInParty, viewer: CheckInViewer): string {
  return party === viewer.party ? "you" : viewer.counterpartName;
}

function capitalized(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
