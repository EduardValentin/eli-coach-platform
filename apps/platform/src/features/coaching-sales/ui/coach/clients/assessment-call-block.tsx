import { PortalWidget, Reading } from "@eli-coach-platform/ui/portal";
import { Video } from "lucide-react";

import {
  formatClockTime,
  formatShortDay,
} from "~/features/assessment-calls/contracts/call-moment";
import { labelForPrimaryGoal } from "~/features/assessment-calls/contracts/visitor-profile";
import type { CoachClient } from "~/features/coaching-sales/contracts/coach-clients";
import { reducedPriceLabel } from "~/features/coaching-sales/ui/coach/call-sales/pricing-tier-label";
import { useCalendarDayTimeZone } from "~/features/coaching-sales/ui/shared/calendar-day-format";

import { ABSENT_VALUE } from "./absent-value";

type AssessmentCallBlockProps = {
  client: Pick<CoachClient, "assessmentCall" | "subscription">;
};

function shortCallMoment(startsAt: string, timeZone: string): string {
  const instant = new Date(startsAt);

  return `${formatShortDay(instant, timeZone)} · ${formatClockTime(instant, timeZone)}`;
}

export function AssessmentCallBlock({ client }: AssessmentCallBlockProps) {
  const { assessmentCall, subscription } = client;
  const timeZone = useCalendarDayTimeZone();

  return (
    <PortalWidget
      data-parity-root="AssessmentCallBlock"
      className="mb-8"
      headingId="assessment-call-panel-heading"
      icon={
        <Video aria-hidden="true" className="text-brand-secondary" size={18} />
      }
      title="Assessment call"
    >
      <dl className="grid grid-cols-2 gap-5 sm:grid-cols-4">
        <Reading
          as="dl-item"
          className="col-span-full sm:col-span-1"
          label="Call"
          value={shortCallMoment(assessmentCall.startsAt, timeZone)}
          valueParity="call-date"
        />
        <Reading
          as="dl-item"
          label="Primary goal"
          value={labelForPrimaryGoal(assessmentCall.primaryGoal)}
          valueParity="call-goal"
        />
        <Reading
          as="dl-item"
          label="Reduced price"
          value={
            subscription ? reducedPriceLabel(subscription.tier) : ABSENT_VALUE
          }
          valueParity="call-reduced-price"
        />
        <Reading
          as="dl-item"
          className="col-span-full"
          label="Booking notes"
          value={assessmentCall.notes ?? ABSENT_VALUE}
          valueParity="call-notes"
        />
      </dl>
    </PortalWidget>
  );
}
