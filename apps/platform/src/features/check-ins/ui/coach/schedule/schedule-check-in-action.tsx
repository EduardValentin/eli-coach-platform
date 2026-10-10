import type { VisitorGender } from "@eli-coach-platform/domain/assessment-call";
import { useCalendarDayTimeZone } from "@eli-coach-platform/ui/lib";
import { Button, DisabledActionHint } from "@eli-coach-platform/ui/primitives";
import { toast } from "@eli-coach-platform/ui/toast";
import { CalendarPlus } from "lucide-react";
import { useState } from "react";

import { formatShortDay } from "~/features/assessment-calls/public/call-moment";
import {
  possessivePronoun,
  subjectPronoun,
} from "~/features/assessment-calls/public/visitor-profile";
import type { CheckInScheduling } from "~/features/check-ins/public/check-ins";
import { CHECK_INS_API_PATHS } from "~/features/check-ins/public/paths";
import { CheckInPicker } from "~/features/check-ins/ui/shared/check-ins/check-in-picker";

type ScheduledClient = {
  clientId: string;
  firstName: string;
};

type ScheduleCheckInActionProps = {
  client: ScheduledClient & { gender: VisitorGender };
  scheduling: CheckInScheduling;
};

type ScheduleCheckInDialogProps = {
  client: ScheduledClient;
  onOpenChange: (open: boolean) => void;
  onScheduled: (startsAt: string) => void;
  open: boolean;
  timeZone: string;
};

export function ScheduleCheckInAction({
  client,
  scheduling,
}: ScheduleCheckInActionProps) {
  const timeZone = useCalendarDayTimeZone();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [openings, setOpenings] = useState(0);

  if (scheduling === "ended") return null;

  const button = (
    <Button
      onClick={() => {
        setOpenings((count) => count + 1);
        setDialogOpen(true);
      }}
    >
      <CalendarPlus aria-hidden="true" size={16} />
      Schedule check-in
    </Button>
  );

  if (scheduling === "awaiting_onboarding") {
    return (
      <DisabledActionHint reason={awaitingOnboardingReason(client.gender)}>
        {button}
      </DisabledActionHint>
    );
  }

  return (
    <>
      {button}
      <ScheduleCheckInDialog
        client={client}
        key={openings}
        onOpenChange={setDialogOpen}
        onScheduled={(startsAt) =>
          toast.success(
            `Check-in scheduled for ${formatShortDay(new Date(startsAt), timeZone)}`,
          )
        }
        open={dialogOpen}
        timeZone={timeZone}
      />
    </>
  );
}

function ScheduleCheckInDialog({
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

function awaitingOnboardingReason(gender: VisitorGender): string {
  const subject = subjectPronoun(gender);

  return `${subject.capitalised} can answer a check-in once ${subject.lower} ${subject.hasVerb} sent ${possessivePronoun(gender).lower} onboarding.`;
}
