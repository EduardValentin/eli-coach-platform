import type { VisitorGender } from "~/bounded-contexts/scheduling/public/visitor";
import {
  ABSENT_VALUE,
  formatDayMonth,
  useCalendarDayTimeZone,
} from "~/shared/design-system/lib";
import { PortalWidget, Reading } from "~/shared/design-system/portal";
import { CreditCard } from "lucide-react";

import { possessivePronoun } from "~/bounded-contexts/scheduling/assessment-calls/public/visitor-profile";
import { bundleLengthLabel } from "~/bounded-contexts/clients/clients/public/clients";
import type { ClientSubscription } from "~/bounded-contexts/sales/coaching-sales/public/client-subscription";
import { formatMoney } from "~/bounded-contexts/sales/coaching-sales/public/money";
import { REFUND_REASON_LABELS } from "~/bounded-contexts/sales/coaching-sales/public/subscription-refunds";

const IMMEDIATE_START_LABEL = "Immediate start";

const REDUCED_PRICE_ANSWER = "Yes";

const REGULAR_PRICE_ANSWER = "No";

type SubscriptionRefund = NonNullable<ClientSubscription["refund"]>;

type SubscriptionSummaryProps = {
  gender: VisitorGender;
  subscription: ClientSubscription;
  className?: string;
};

type PeriodReading = { label: string; value: string };

function startLabel(workStartDay: string | null): string {
  return workStartDay
    ? `After the 14 days (${workStartDay})`
    : IMMEDIATE_START_LABEL;
}

function periodReading(
  subscription: ClientSubscription,
  gender: VisitorGender,
  timeZone: string,
): PeriodReading {
  if (subscription.status === "cancelled" && subscription.endsOn) {
    return {
      label: "Ends on",
      value: formatDayMonth(subscription.endsOn, timeZone),
    };
  }

  if (subscription.status === "ended" && subscription.endedOn) {
    return {
      label: "Ended on",
      value: formatDayMonth(subscription.endedOn, timeZone),
    };
  }

  return {
    label: "Renews on",
    value: `Starts when ${possessivePronoun(gender).lower} program is delivered`,
  };
}

function refundDueValue(refund: SubscriptionRefund, timeZone: string): string {
  const outstanding = formatMoney(refund.outstandingCents, refund.currency);

  return refund.dueBy
    ? `${outstanding} by ${formatDayMonth(refund.dueBy, timeZone)}`
    : outstanding;
}

function refundDetail(refund: SubscriptionRefund): string {
  const reason = REFUND_REASON_LABELS[refund.reason];

  if (refund.refundedCents === 0) {
    return reason;
  }

  return `${reason} ${formatMoney(refund.refundedCents, refund.currency)} refunded so far.`;
}

function RefundReading({
  refund,
  timeZone,
}: {
  refund: SubscriptionRefund;
  timeZone: string;
}) {
  if (refund.refundedOn) {
    return (
      <Reading
        as="dl-item"
        label="Refunded"
        value={formatDayMonth(refund.refundedOn, timeZone)}
        valueParity="subscription-refunded"
      />
    );
  }

  return (
    <Reading
      as="dl-item"
      className="col-span-2 sm:col-span-3"
      detail={refundDetail(refund)}
      detailParity="subscription-refund-reason"
      label="Refund due"
      value={refundDueValue(refund, timeZone)}
      valueParity="subscription-refund-due"
    />
  );
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
  const period = periodReading(subscription, gender, timeZone);

  return (
    <PortalWidget
      data-parity-root="SubscriptionSummary"
      className={className}
      headingId="subscription-panel-heading"
      icon={CreditCard}
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
          label={period.label}
          value={period.value}
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
        {subscription.refund && (
          <RefundReading refund={subscription.refund} timeZone={timeZone} />
        )}
      </dl>
    </PortalWidget>
  );
}
