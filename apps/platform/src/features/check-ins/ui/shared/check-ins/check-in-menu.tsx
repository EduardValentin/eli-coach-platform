import type { RowMenuAction } from "@eli-coach-platform/ui/primitives";
import { CalendarClock, CalendarX } from "lucide-react";
import { useState } from "react";

import { CancelCheckInDialog } from "./cancel-check-in-dialog";
import type { CheckInDecisions } from "./check-in-decisions";
import { checkInMomentOf, type ListedCheckIn } from "./check-in-listing";
import {
  ProposeCheckInTimeDialog,
  type CheckInProposer,
} from "./propose-check-in-time-dialog";

type CheckInMenuChoice = "propose" | "cancel";

type ChosenCheckIn<CheckIn extends ListedCheckIn> = {
  choice: CheckInMenuChoice;
  checkIn: CheckIn;
  opening: number;
  open: boolean;
};

export type CheckInMenu<CheckIn extends ListedCheckIn> = {
  cancellation: ChosenCheckIn<CheckIn> | null;
  menuOf: (checkIn: CheckIn) => RowMenuAction[];
  onDialogOpenChange: (open: boolean) => void;
  proposal: ChosenCheckIn<CheckIn> | null;
};

type CheckInCancellationWording = {
  description: string;
  successMessage: string;
};

export type CheckInMenuWording<CheckIn extends ListedCheckIn> = {
  cancellationOf: (
    checkIn: CheckIn,
    dayAndTime: string,
  ) => CheckInCancellationWording;
  proposerOf: (checkIn: CheckIn) => CheckInProposer;
};

type CheckInMenuDialogsProps<CheckIn extends ListedCheckIn> = {
  decisions: CheckInDecisions;
  menu: CheckInMenu<CheckIn>;
  timeZone: string;
  wording: CheckInMenuWording<CheckIn>;
};

const MOVES_EXHAUSTED_REASON = "This check-in has already been moved twice.";

export function useCheckInMenu<CheckIn extends ListedCheckIn>(
  decisions: CheckInDecisions,
): CheckInMenu<CheckIn> {
  const [chosen, setChosen] = useState<ChosenCheckIn<CheckIn> | null>(null);

  const choose = (choice: CheckInMenuChoice, checkIn: CheckIn) =>
    setChosen((current) => ({
      choice,
      checkIn,
      opening: (current?.opening ?? 0) + 1,
      open: true,
    }));

  const dialogFor = (choice: CheckInMenuChoice) =>
    chosen?.choice === choice ? chosen : null;

  const menuOf = (checkIn: CheckIn): RowMenuAction[] => {
    const deciding = decisions.decidingKindOf(checkIn.id) !== null;
    const reschedule: RowMenuAction = {
      disabled: deciding,
      icon: CalendarClock,
      label: "Reschedule",
      name: "reschedule",
      onSelect: () => choose("propose", checkIn),
      ...(checkIn.viewerProposal === "exhausted" && {
        disabledReason: MOVES_EXHAUSTED_REASON,
      }),
    };
    const cancel: RowMenuAction = {
      disabled: deciding,
      icon: CalendarX,
      label: "Cancel",
      name: "cancel",
      onSelect: () => choose("cancel", checkIn),
      tone: "destructive",
    };

    return [
      ...(checkIn.viewerProposal === "none" ? [] : [reschedule]),
      ...(checkIn.viewerMayCancel ? [cancel] : []),
    ];
  };

  return {
    cancellation: dialogFor("cancel"),
    menuOf,
    onDialogOpenChange: (open: boolean) =>
      setChosen((current) => current && { ...current, open }),
    proposal: dialogFor("propose"),
  };
}

export function CheckInMenuDialogs<CheckIn extends ListedCheckIn>({
  decisions,
  menu: { cancellation, onDialogOpenChange, proposal },
  timeZone,
  wording,
}: CheckInMenuDialogsProps<CheckIn>) {
  return (
    <>
      {proposal && (
        <ProposeCheckInTimeDialog
          checkIn={proposal.checkIn}
          key={`proposal-${proposal.opening}`}
          onOpenChange={onDialogOpenChange}
          open={proposal.open}
          proposer={wording.proposerOf(proposal.checkIn)}
          timeZone={timeZone}
        />
      )}

      {cancellation && (
        <CancelCheckInDialog
          cancellation={{
            checkInId: cancellation.checkIn.id,
            ...wording.cancellationOf(
              cancellation.checkIn,
              dayAndTimeOf(cancellation.checkIn, timeZone),
            ),
          }}
          decisions={decisions}
          key={`cancellation-${cancellation.opening}`}
          onOpenChange={onDialogOpenChange}
          open={cancellation.open}
        />
      )}
    </>
  );
}

function dayAndTimeOf(checkIn: ListedCheckIn, timeZone: string): string {
  const { date, time } = checkInMomentOf(checkIn.startsAt, timeZone);

  return `${date} at ${time}`;
}
