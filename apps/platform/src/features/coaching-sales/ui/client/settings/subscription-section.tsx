import {
  describedByOf,
  formatDayMonth,
  useCalendarDayTimeZone,
} from "@eli-coach-platform/ui/lib";
import {
  SettingsRow,
  SettingsRows,
  SettingsSection,
} from "@eli-coach-platform/ui/portal";
import { Button } from "@eli-coach-platform/ui/primitives";
import { CreditCard } from "lucide-react";
import { useRef } from "react";
import { useSearchParams } from "react-router";

import {
  PAYMENT_METHOD_UNAVAILABLE_PARAM,
  type ClientSettings,
} from "~/features/coaching-sales/contracts/client-subscription";
import { ManagePaymentMethodButton } from "~/features/coaching-sales/ui/client/payment-method/manage-payment-method-button";
import {
  PaymentMethodProblems,
  type PaymentMethodProblem,
} from "~/features/coaching-sales/ui/client/payment-method/payment-method-problems";

import { CancelSubscriptionDialog } from "./cancel-subscription-dialog";
import {
  activePlanLine,
  CANCEL_ROW_ACTION_LABEL,
  CANCELLATION_ROW_TITLE,
  cancelledPlanLine,
  FULL_REFUND_CONFIRMATION,
  fullRefundFacts,
  MANAGE_ROW_ACTION_LABEL,
  noRefundFacts,
  PAYMENT_METHOD_ROW_TITLE,
  planTitle,
  SUBSCRIPTION_TITLE,
  waitingPlanLine,
} from "./subscription-copy";
import {
  useCancelSubscription,
  type CancelSubscription,
} from "./use-cancel-subscription";

type Subscription = ClientSettings["subscription"];
type Cancellation = NonNullable<ClientSettings["cancellation"]>;
type DayOf = (instant: string) => string;

const ROW_ACTION_CLASS = "w-full sm:w-28";

const CANCELLATION_IDS = {
  title: "subscription-cancel-label",
  description: "subscription-cancel-description",
};

const PAYMENT_METHOD_IDS = {
  title: "subscription-payment-label",
  problems: {
    "payment-problem": "subscription-payment-problem",
    "hand-off-failed": "subscription-payment-method-problem",
  },
} as const;

function planLine(subscription: Subscription, dayOf: DayOf): string {
  const { accessEndsAt, cancelledAt, paidAt, status } = subscription;

  if (status === "cancelled" && cancelledAt && accessEndsAt) {
    return cancelledPlanLine({
      paidDay: dayOf(paidAt),
      cancelledDay: dayOf(cancelledAt),
      accessEndDay: dayOf(accessEndsAt),
    });
  }

  if (status === "active" && accessEndsAt) {
    return activePlanLine(dayOf(accessEndsAt));
  }

  return waitingPlanLine(dayOf(paidAt));
}

function cancellationWording(cancellation: Cancellation, dayOf: DayOf) {
  if (cancellation.rule === "full-refund") {
    return {
      facts: fullRefundFacts(dayOf(cancellation.withdrawalDeadline)),
      confirmation: FULL_REFUND_CONFIRMATION,
    };
  }

  const facts = noRefundFacts(dayOf(cancellation.paidThrough));

  return { facts, confirmation: facts };
}

type CancellationRowProps = {
  cancellation: Cancellation;
  cancelSubscription: CancelSubscription;
  dayOf: DayOf;
};

function CancellationRow({
  cancellation,
  cancelSubscription,
  dayOf,
}: CancellationRowProps) {
  const { askToConfirm, dialog } = cancelSubscription;
  const { facts, confirmation } = cancellationWording(cancellation, dayOf);

  return (
    <SettingsRow
      data-parity="subscription-cancellation"
      description={facts}
      descriptionId={CANCELLATION_IDS.description}
      labelId={CANCELLATION_IDS.title}
      title={CANCELLATION_ROW_TITLE}
    >
      <Button
        aria-describedby={`${CANCELLATION_IDS.title} ${CANCELLATION_IDS.description}`}
        className={ROW_ACTION_CLASS}
        data-parity="cancel-action"
        onClick={askToConfirm}
        size="sm"
        variant="destructive-outline"
      >
        {CANCEL_ROW_ACTION_LABEL}
      </Button>
      <CancelSubscriptionDialog
        confirmation={confirmation}
        dialog={dialog}
        rule={cancellation.rule}
      />
    </SettingsRow>
  );
}

function usePaymentMethodUnavailable(): boolean {
  const [searchParams] = useSearchParams();

  return (
    searchParams.get(PAYMENT_METHOD_UNAVAILABLE_PARAM.name) ===
    PAYMENT_METHOD_UNAVAILABLE_PARAM.value
  );
}

function PaymentMethodRow({ subscription }: { subscription: Subscription }) {
  const handOffFailed = usePaymentMethodUnavailable();
  const shown: PaymentMethodProblem[] = [
    ...(subscription.paymentProblem ? (["payment-problem"] as const) : []),
    ...(handOffFailed ? (["hand-off-failed"] as const) : []),
  ];

  return (
    <SettingsRow
      data-parity="subscription-payment-method"
      labelId={PAYMENT_METHOD_IDS.title}
      problem={
        shown.length > 0 && (
          <div className="grid gap-1">
            <PaymentMethodProblems
              ids={PAYMENT_METHOD_IDS.problems}
              shown={shown}
            />
          </div>
        )
      }
      title={PAYMENT_METHOD_ROW_TITLE}
    >
      <ManagePaymentMethodButton
        aria-describedby={describedByOf(
          PAYMENT_METHOD_IDS.title,
          ...shown.map((problem) => PAYMENT_METHOD_IDS.problems[problem]),
        )}
        className={ROW_ACTION_CLASS}
        label={MANAGE_ROW_ACTION_LABEL}
      />
    </SettingsRow>
  );
}

export function SubscriptionSection({
  settings,
}: {
  settings: ClientSettings;
}) {
  const subscriptionHeading = useRef<HTMLHeadingElement>(null);
  const timeZone = useCalendarDayTimeZone();
  const cancelSubscription = useCancelSubscription(subscriptionHeading);
  const { subscription, cancellation } = settings;

  if (subscription.status === "ended") {
    return null;
  }

  const dayOf: DayOf = (instant) => formatDayMonth(instant, timeZone);

  return (
    <SettingsSection
      data-parity-root="SubscriptionSection"
      headingId="subscription-heading"
      headingRef={subscriptionHeading}
      icon={
        <CreditCard
          aria-hidden="true"
          className="text-brand-secondary"
          size={18}
        />
      }
      title={SUBSCRIPTION_TITLE}
    >
      <SettingsRows>
        <SettingsRow
          data-parity="subscription-plan"
          description={planLine(subscription, dayOf)}
          labelId="subscription-plan-label"
          title={planTitle(subscription.months)}
        />
        {cancellation && (
          <CancellationRow
            cancelSubscription={cancelSubscription}
            cancellation={cancellation}
            dayOf={dayOf}
          />
        )}
        {subscription.status !== "cancelled" && (
          <PaymentMethodRow subscription={subscription} />
        )}
      </SettingsRows>
    </SettingsSection>
  );
}
