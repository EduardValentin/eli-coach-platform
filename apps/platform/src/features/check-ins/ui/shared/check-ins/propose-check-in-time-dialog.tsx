import { toast } from "~/shared/design-system/toast";
import { generatePath, useRevalidator } from "react-router";

import { CHECK_INS_API_PATHS } from "~/features/check-ins/public/paths";

import { NO_LONGER_WAITING } from "./check-in-decisions";
import { checkInMomentOf } from "./check-in-listing";
import type { ListedCheckIn } from "./check-in-listing-rules";
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
  const current = checkInMomentOf(checkIn.startsAt, timeZone);

  return (
    <CheckInPicker
      onOpenChange={onOpenChange}
      onRefusal={() => void revalidate()}
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
        description: `Currently set for ${current.date} · ${current.time}`,
        noteLabel,
        problemCopy: PROBLEM_COPY,
        stepVerb: "Propose",
        title: "Propose a new time",
      }}
    />
  );
}
