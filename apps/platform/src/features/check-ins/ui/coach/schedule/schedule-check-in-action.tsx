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

import {
  ScheduleCheckInDialog,
  type ScheduledClient,
} from "./schedule-check-in-dialog";

type ScheduleCheckInActionProps = {
  client: ScheduledClient & { gender: VisitorGender };
  scheduling: CheckInScheduling;
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

function awaitingOnboardingReason(gender: VisitorGender): string {
  const subject = subjectPronoun(gender);

  return `${subject.capitalised} can answer a check-in once ${subject.lower} ${subject.hasVerb} sent ${possessivePronoun(gender).lower} onboarding.`;
}
