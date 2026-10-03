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
import { Button, InlineProblem } from "@eli-coach-platform/ui/primitives";
import { CreditCard } from "lucide-react";
import { useRef } from "react";
import { useSearchParams } from "react-router";

import {
  PAYMENT_METHOD_UNAVAILABLE_PARAM,
  type ClientSettings,
} from "~/features/coaching-sales/contracts/client-subscription";

import { CancelSubscriptionDialog } from "./cancel-subscription-dialog";
import { PaymentMethodForm } from "./payment-method-form";
import {
  activePlanLine,
  CANCEL_ROW_ACTION_LABEL,
  CANCELLATION_ROW_TITLE,
  cancelledPlanLine,
  FULL_REFUND_CONFIRMATION,
  fullRefundFacts,
  MANAGE_ROW_ACTION_LABEL,
  noRefundFacts,
  OPENING_PAYMENT_METHOD_LABEL,
  PAYMENT_METHOD_ROW_TITLE,
  PAYMENT_METHOD_UNAVAILABLE_MESSAGE,
  PAYMENT_PROBLEM_LINE,
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
  paymentProblem: "subscription-payment-problem",
  handOffProblem: "subscription-payment-method-problem",
};

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
  const { paymentProblem } = subscription;
  const handOffFailed = usePaymentMethodUnavailable();

  return (
    <SettingsRow
      data-parity="subscription-payment-method"
      labelId={PAYMENT_METHOD_IDS.title}
      problem={
        (paymentProblem || handOffFailed) && (
          <div className="grid gap-1">
            {paymentProblem && (
              <InlineProblem
                data-parity="payment-problem"
                id={PAYMENT_METHOD_IDS.paymentProblem}
                role="status"
              >
                {PAYMENT_PROBLEM_LINE}
              </InlineProblem>
            )}
            {handOffFailed && (
              <InlineProblem
                data-parity="payment-method-problem"
                id={PAYMENT_METHOD_IDS.handOffProblem}
                role="alert"
              >
                {PAYMENT_METHOD_UNAVAILABLE_MESSAGE}
              </InlineProblem>
            )}
          </div>
        )
      }
      title={PAYMENT_METHOD_ROW_TITLE}
    >
      <PaymentMethodForm>
        {({ opening }) => (
          <Button
            aria-busy={opening}
            aria-describedby={describedByOf(
              PAYMENT_METHOD_IDS.title,
              paymentProblem ? PAYMENT_METHOD_IDS.paymentProblem : undefined,
              handOffFailed ? PAYMENT_METHOD_IDS.handOffProblem : undefined,
            )}
            className={ROW_ACTION_CLASS}
            data-parity="manage-payment-method"
            disabled={opening}
            size="sm"
            type="submit"
            variant="outline"
          >
            {opening ? OPENING_PAYMENT_METHOD_LABEL : MANAGE_ROW_ACTION_LABEL}
          </Button>
        )}
      </PaymentMethodForm>
    </SettingsRow>
  );
}

export function SubscriptionSection({
  settings,
}: {
  settings: ClientSettings;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const timeZone = useCalendarDayTimeZone();
  const cancelSubscription = useCancelSubscription(heading);
  const { subscription, cancellation } = settings;

  if (subscription.status === "ended") {
    return null;
  }

  const dayOf: DayOf = (instant) => formatDayMonth(instant, timeZone);

  return (
    <SettingsSection
      data-parity-root="SubscriptionSection"
      headingId="subscription-heading"
      headingRef={heading}
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
