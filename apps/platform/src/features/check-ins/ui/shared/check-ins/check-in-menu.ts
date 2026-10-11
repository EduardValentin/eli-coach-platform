import type { RowMenuAction } from "@eli-coach-platform/ui/primitives";
import { CalendarClock, CalendarX } from "lucide-react";
import { useState } from "react";

import type { CheckInDecisions } from "./check-in-decisions";
import type { ListedCheckIn } from "./check-in-listing";

type CheckInMenuChoice = "reschedule" | "cancel";

type ChosenCheckIn<CheckIn extends ListedCheckIn> = {
  choice: CheckInMenuChoice;
  checkIn: CheckIn;
  opening: number;
  open: boolean;
};

const MOVES_EXHAUSTED_REASON = "This check-in has already been moved twice.";

export function useCheckInMenu<CheckIn extends ListedCheckIn>(
  decisions: CheckInDecisions,
) {
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
    const disabled = decisions.decidingKindOf(checkIn.id) !== null;
    const reschedule: RowMenuAction = {
      disabled,
      icon: CalendarClock,
      label: "Reschedule",
      name: "reschedule",
      onSelect: () => choose("reschedule", checkIn),
      ...(checkIn.viewerProposal === "exhausted" && {
        disabledReason: MOVES_EXHAUSTED_REASON,
      }),
    };
    const cancel: RowMenuAction = {
      disabled,
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
    proposal: dialogFor("reschedule"),
  };
}
