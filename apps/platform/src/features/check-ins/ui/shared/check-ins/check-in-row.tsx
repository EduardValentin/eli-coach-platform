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

import { checkInMomentOf } from "./check-in-listing";
import type { CheckInParty, ListedCheckIn } from "./check-in-listing-rules";

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

const KIND_LABELS: Record<ListedCheckIn["kind"], string | null> = {
  ad_hoc: "Ad-hoc",
  recurring: null,
};

const CLASH_LABELS: Record<CheckInParty, string> = {
  coach: "Finding a new time",
  client: "Your coach is finding a new time",
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
  const when = checkInMomentOf(checkIn.startsAt, timeZone);
  const { newTimeWaits } = checkIn;
  const earlierWhen =
    checkIn.earlierStartsAt === null
      ? undefined
      : checkInMomentOf(checkIn.earlierStartsAt, timeZone);
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
      badges={statusBadgeOf(checkIn)}
      parity="checkin-card-body"
      parityRoot="CheckinCard"
      quote={shownNote?.text}
      quoteAuthor={shownNote && capitalized(nameFor(shownNote.by, viewer))}
      quoteParity="checkin-note"
      rescheduledFrom={newTimeWaits ? undefined : earlierWhen}
      status={isOver ? "past" : "scheduled"}
      supersededWhen={newTimeWaits ? earlierWhen : undefined}
      when={when}
      whenLabel={whenLabelOf(checkIn, viewer)}
    />
  );
}

function whenLabelOf(checkIn: ListedCheckIn, viewer: CheckInViewer): string {
  if (checkIn.status === "clash") return CLASH_LABELS[viewer.party];

  return [KIND_LABELS[checkIn.kind], moveLabelOf(checkIn, viewer)]
    .filter(Boolean)
    .join(" · ");
}

function moveLabelOf(
  checkIn: ListedCheckIn,
  viewer: CheckInViewer,
): string | null {
  if (checkIn.newTimeWaits) {
    return `New time from ${nameFor(checkIn.proposedBy, viewer)}`;
  }

  return checkIn.kind === "ad_hoc"
    ? `Requested by ${nameFor(checkIn.initiatedBy, viewer)}`
    : null;
}

function statusBadgeOf(checkIn: ListedCheckIn): ReactNode {
  if (checkIn.status === "cancelled") {
    return <Badge tone="muted">Cancelled</Badge>;
  }

  if (checkIn.status === "clash") {
    return (
      <Badge data-parity="clash-badge" tone="pending">
        Clash
      </Badge>
    );
  }

  return undefined;
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
