import { toast } from "@eli-coach-platform/ui/toast";
import { generatePath, useRevalidator } from "react-router";

import {
  formatClockTime,
  formatShortDay,
} from "~/features/assessment-calls/public/call-moment";
import { CHECK_INS_API_PATHS } from "~/features/check-ins/public/paths";

import { NO_LONGER_WAITING } from "./check-in-decisions";
import type { ListedCheckIn } from "./check-in-listing";
import {
  CheckInPicker,
  type CheckInPickerWording,
  type OpenTimesQuery,
} from "./check-in-picker";

export type CheckInProposer = {
  clientTimeZone?: string;
  noteLabel: string;
  openTimesQuery?: OpenTimesQuery;
};

type ProposeCheckInTimeDialogProps = {
  checkIn: ListedCheckIn;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  proposer: CheckInProposer;
  timeZone: string;
};

const PROBLEM_COPY: CheckInPickerWording["problemCopy"] = {
  moves_exhausted: "This check-in can't be moved any more.",
  not_pending: NO_LONGER_WAITING,
  failed: "The new time wasn't proposed. Try again.",
};

export function ProposeCheckInTimeDialog({
  checkIn,
  onOpenChange,
  open,
  proposer: { clientTimeZone, noteLabel, openTimesQuery },
  timeZone,
}: ProposeCheckInTimeDialogProps) {
  const { revalidate } = useRevalidator();
  const startsAt = new Date(checkIn.startsAt);

  return (
    <CheckInPicker
      onOpenChange={onOpenChange}
      onRefused={() => void revalidate()}
      onSubmitted={() => toast.success("New time proposed")}
      open={open}
      openTimesQuery={openTimesQuery}
      submission={{
        action: generatePath(CHECK_INS_API_PATHS.newTime, {
          checkInId: checkIn.id,
        }),
        bodyOf: ({ note, startsAt: chosen }) => ({
          note,
          startsAt: chosen,
          ...(clientTimeZone && { timeZone: clientTimeZone }),
        }),
      }}
      timeZone={timeZone}
      wording={{
        busyLabel: "Proposing…",
        description: `Currently set for ${formatShortDay(startsAt, timeZone)} · ${formatClockTime(startsAt, timeZone)}`,
        noteLabel,
        problemCopy: PROBLEM_COPY,
        stepVerb: "Propose",
        title: "Propose a new time",
      }}
    />
  );
}
