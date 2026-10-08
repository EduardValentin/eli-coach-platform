import {
  ABSENT_VALUE,
  formatDayMonthYear,
  PhoneLink,
  useCalendarDayTimeZone,
} from "@eli-coach-platform/ui/lib";
import {
  CollapsiblePortalWidget,
  Reading,
} from "@eli-coach-platform/ui/portal";
import { Video } from "lucide-react";

import {
  formatClockTime,
  formatShortDay,
} from "~/features/assessment-calls/public/call-moment";
import { findCountry } from "~/features/assessment-calls/public/countries";
import {
  labelForGender,
  labelForPrimaryGoal,
} from "~/features/assessment-calls/public/visitor-profile";
import type { CoachClient } from "~/features/coaching-sales/public/coach-clients";

const CALENDAR_DATE_TIME_ZONE = "UTC";

type AssessmentCallBlockProps = {
  client: Pick<CoachClient, "assessmentCall">;
};

function shortCallMoment(startsAt: string, timeZone: string): string {
  const instant = new Date(startsAt);

  return `${formatShortDay(instant, timeZone)} · ${formatClockTime(instant, timeZone)}`;
}

export function AssessmentCallBlock({ client }: AssessmentCallBlockProps) {
  const { assessmentCall } = client;
  const timeZone = useCalendarDayTimeZone();

  return (
    <CollapsiblePortalWidget
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
          label="Name"
          value={`${assessmentCall.firstName} ${assessmentCall.lastName}`.trim()}
          valueParity="call-name"
        />
        <Reading
          as="dl-item"
          label="Email"
          value={assessmentCall.email}
          valueParity="call-email"
        />
        <Reading
          as="dl-item"
          label="Date of birth"
          value={formatDayMonthYear(
            assessmentCall.dateOfBirth,
            CALENDAR_DATE_TIME_ZONE,
          )}
          valueParity="call-dob"
        />
        <Reading
          as="dl-item"
          label="Gender"
          value={labelForGender(assessmentCall.gender)}
          valueParity="call-gender"
        />
        <Reading
          as="dl-item"
          label="Country"
          value={
            findCountry(assessmentCall.country)?.name ?? assessmentCall.country
          }
          valueParity="call-country"
        />
        <Reading
          as="dl-item"
          label="Phone"
          value={<PhoneLink phone={assessmentCall.phone} />}
          valueParity="call-phone"
        />
        <Reading
          as="dl-item"
          label="Primary goal"
          value={labelForPrimaryGoal(assessmentCall.primaryGoal)}
          valueParity="call-goal"
        />
        <Reading
          as="dl-item"
          className="col-span-full"
          label="Booking notes"
          value={assessmentCall.notes ?? ABSENT_VALUE}
          valueParity="call-notes"
        />
      </dl>
    </CollapsiblePortalWidget>
  );
}
