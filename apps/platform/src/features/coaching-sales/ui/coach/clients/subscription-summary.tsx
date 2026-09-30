import type { VisitorGender } from "@eli-coach-platform/domain/assessment-call";
import { ABSENT_VALUE } from "@eli-coach-platform/ui/lib";
import { PortalWidget, Reading } from "@eli-coach-platform/ui/portal";
import { CreditCard } from "lucide-react";

import { possessivePronoun } from "~/features/assessment-calls/contracts/visitor-profile";
import { bundleLengthLabel } from "~/features/coaching-sales/contracts/bundle-cards";
import type { ClientSubscription } from "~/features/coaching-sales/contracts/coach-clients";
import {
  formatDayMonth,
  useCalendarDayTimeZone,
} from "~/features/coaching-sales/ui/shared/calendar-day-format";

const IMMEDIATE_START_LABEL = "Immediate start";

const REDUCED_PRICE_ANSWER = "Yes";

const REGULAR_PRICE_ANSWER = "No";

type SubscriptionSummaryProps = {
  gender: VisitorGender;
  subscription: ClientSubscription;
  className?: string;
};

function renewsBeforeProgramLabel(gender: VisitorGender): string {
  return `Once ${possessivePronoun(gender).lower} program starts`;
}

function startLabel(workStartDay: string | null): string {
  return workStartDay
    ? `After the 14 days (${workStartDay})`
    : IMMEDIATE_START_LABEL;
}

export function SubscriptionSummary({
  className,
  gender,
  subscription,
}: SubscriptionSummaryProps) {
  const timeZone = useCalendarDayTimeZone();
  const workStartDay = subscription.workStartsOn
    ? formatDayMonth(subscription.workStartsOn, timeZone)
    : null;

  return (
    <PortalWidget
      data-parity-root="SubscriptionSummary"
      className={className}
      headingId="subscription-panel-heading"
      icon={
        <CreditCard
          aria-hidden="true"
          className="text-brand-secondary"
          size={18}
        />
      }
      title="Subscription"
    >
      <dl className="grid grid-cols-2 gap-5 sm:grid-cols-3">
        <Reading
          as="dl-item"
          label="Bundle"
          value={bundleLengthLabel(subscription.months)}
          valueParity="subscription-bundle"
        />
        <Reading
          as="dl-item"
          label="Payment date"
          value={formatDayMonth(subscription.paidAt, timeZone)}
          valueParity="subscription-paid"
        />
        <Reading
          as="dl-item"
          label="Start"
          value={startLabel(workStartDay)}
          valueParity="subscription-start"
        />
        <Reading
          as="dl-item"
          label="Start program"
          value={ABSENT_VALUE}
          valueParity="subscription-program-start"
        />
        <Reading
          as="dl-item"
          label="Renews on"
          value={renewsBeforeProgramLabel(gender)}
          valueParity="subscription-renews"
        />
        <Reading
          as="dl-item"
          label="Reduced price"
          value={
            subscription.reducedPrice
              ? REDUCED_PRICE_ANSWER
              : REGULAR_PRICE_ANSWER
          }
          valueParity="subscription-reduced-price"
        />
      </dl>
    </PortalWidget>
  );
}
