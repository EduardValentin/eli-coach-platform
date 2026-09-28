import { PortalWidget, Reading } from "@eli-coach-platform/ui/portal";
import { CreditCard } from "lucide-react";

import { bundleLengthLabel } from "~/features/coaching-sales/contracts/bundle-cards";
import type { ClientSubscription } from "~/features/coaching-sales/contracts/coach-clients";
import {
  formatDayMonth,
  useCalendarDayTimeZone,
} from "~/features/coaching-sales/ui/shared/calendar-day-format";

const ABSENT = "—";

const IMMEDIATE_START_LABEL = "Immediate start";
const RENEWS_BEFORE_PROGRAM_LABEL = "Once her program starts";

type SubscriptionSummaryProps = {
  subscription: ClientSubscription;
  className?: string;
};

function startLabel(workStartDay: string | null): string {
  return workStartDay
    ? `After the 14 days (${workStartDay})`
    : IMMEDIATE_START_LABEL;
}

export function SubscriptionSummary({
  className,
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
      <dl className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
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
          value={ABSENT}
          valueParity="subscription-program-start"
        />
        <Reading
          as="dl-item"
          label="Renews on"
          value={RENEWS_BEFORE_PROGRAM_LABEL}
          valueParity="subscription-renews"
        />
      </dl>
    </PortalWidget>
  );
}
