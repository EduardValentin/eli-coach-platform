import { CHECK_INS_API_PATHS } from "~/features/check-ins/public/paths";
import {
  CheckInPicker,
  type CheckInPickerWording,
} from "~/features/check-ins/ui/shared/check-ins/check-in-picker";

type CheckInRequestDialogProps = {
  onOpenChange: (open: boolean) => void;
  onRequested: (startsAt: string) => void;
  open: boolean;
  timeZone: string;
};

const WORDING: CheckInPickerWording = {
  busyLabel: "Requesting…",
  description:
    "Pick a date and time that works for you. Your coach will approve or decline it.",
  noteLabel: "Add a note for your coach (optional)",
  problemCopy: {
    request_waiting:
      "You already have a check-in request waiting. You can send another once it is answered.",
    failed: "Your request didn't go through. Try again.",
  },
  stepVerb: "Request",
  title: "Request a check-in",
};

export function CheckInRequestDialog({
  onOpenChange,
  onRequested,
  open,
  timeZone,
}: CheckInRequestDialogProps) {
  return (
    <CheckInPicker
      onOpenChange={onOpenChange}
      onSubmitted={onRequested}
      open={open}
      submission={{
        action: CHECK_INS_API_PATHS.requests,
        bodyOf: ({ note, startsAt }) => ({ note, startsAt, timeZone }),
      }}
      timeZone={timeZone}
      wording={WORDING}
    />
  );
}
