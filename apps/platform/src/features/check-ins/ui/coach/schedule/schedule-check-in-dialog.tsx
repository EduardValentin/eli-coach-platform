import { CHECK_INS_API_PATHS } from "~/features/check-ins/public/paths";
import { CheckInPicker } from "~/features/check-ins/ui/shared/check-ins/check-in-picker";

export type ScheduledClient = {
  clientId: string;
  firstName: string;
};

type ScheduleCheckInDialogProps = {
  client: ScheduledClient;
  onOpenChange: (open: boolean) => void;
  onScheduled: (startsAt: string) => void;
  open: boolean;
  timeZone: string;
};

export function ScheduleCheckInDialog({
  client: { clientId, firstName },
  onOpenChange,
  onScheduled,
  open,
  timeZone,
}: ScheduleCheckInDialogProps) {
  return (
    <CheckInPicker
      onOpenChange={onOpenChange}
      onSubmitted={onScheduled}
      open={open}
      submission={{
        action: CHECK_INS_API_PATHS.schedule,
        bodyOf: ({ note, startsAt }) => ({ clientId, note, startsAt }),
      }}
      timeZone={timeZone}
      wording={{
        busyLabel: "Scheduling…",
        description: `Pick a date and time. ${firstName} will approve or decline it.`,
        noteLabel: `Add a note for ${firstName} (optional)`,
        problemCopy: {
          client_cannot_answer: `${firstName} can't answer a check-in right now.`,
          failed: "The check-in wasn't scheduled. Try again.",
        },
        stepVerb: "Schedule",
        title: `Schedule a check-in with ${firstName}`,
      }}
    />
  );
}
