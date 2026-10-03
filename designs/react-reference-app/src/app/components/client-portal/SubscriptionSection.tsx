import { useRef, useState, type RefObject } from 'react';
import { CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { useAppState } from '../../context/AppContext';
import { useClientJourneys } from '../../context/ClientJourneyContext';
import {
  cancellationRule,
  deriveStatus,
  type CoachingSubscription,
  type SubscriptionStatus,
} from '../../domain/coachingSubscription';
import {
  cancelSubscription as sendCancellation,
  SUBSCRIPTION_ERROR_MESSAGES,
  SubscriptionError,
} from '../../services/subscriptionService';
import {
  bundleLengthLabel,
  formatJourneyDate,
} from '../../utils/journeyLabels';
import {
  CANCEL_ACTION_LABELS,
  CANCELLING_LABEL,
  cancelConfirmation,
  cancellationFacts,
  cancelledToast,
  KEEP_COACHING_LABEL,
  PAYMENT_PROBLEM_LINE,
  type OfferedCancellation,
} from '../../utils/subscriptionCopy';
import { Button } from '../ui/button';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { InlineProblem } from '../InlineProblem';
import { SettingsRow, SettingsRows, SettingsSection } from '../SettingsSection';
import { ManagePaymentMethodButton } from './ManagePaymentMethodButton';
import { usePaymentMethodPortal } from './usePaymentMethodPortal';

type OpenStatus = Exclude<SubscriptionStatus, 'ended'>;

function planDescription(
  subscription: CoachingSubscription,
  status: OpenStatus,
): string {
  const paid = `Paid ${formatJourneyDate(subscription.purchasedAt)}`;
  const { cancelledAt, periodEndsAt } = subscription;

  if (status === 'cancelled' && cancelledAt && periodEndsAt) {
    return `${paid} · cancelled ${formatJourneyDate(cancelledAt)} · access until ${formatJourneyDate(periodEndsAt)}.`;
  }
  if (status === 'active' && periodEndsAt) {
    return `Active until ${formatJourneyDate(periodEndsAt)} · renews then unless you cancel first.`;
  }
  return `${paid} · starts when your program is delivered.`;
}

function cancellationProblem(error: unknown): string {
  return error instanceof SubscriptionError
    ? error.message
    : SUBSCRIPTION_ERROR_MESSAGES['cancel-unavailable'];
}

type CancellationRowProps = {
  rule: OfferedCancellation;
  subscription: CoachingSubscription;
  onCancelled: (cancelled: CoachingSubscription) => void;
  focusAfterCancelling: RefObject<HTMLElement | null>;
};

function CancellationRow({
  rule,
  subscription,
  onCancelled,
  focusAfterCancelling,
}: CancellationRowProps) {
  const { appState } = useAppState();
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const now = new Date();
  const action = CANCEL_ACTION_LABELS[rule];

  const changeConfirming = (open: boolean) => {
    setConfirming(open);
    if (!open) setProblem(null);
  };

  const confirm = async () => {
    setCancelling(true);
    setProblem(null);

    try {
      const cancelled = await sendCancellation(
        subscription,
        new Date(),
        appState.cancelOutcome,
      );
      setConfirming(false);
      onCancelled(cancelled);
    } catch (error) {
      setProblem(cancellationProblem(error));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <SettingsRow
      data-parity="subscription-cancellation"
      description={cancellationFacts(rule, subscription, now)}
      labelId="subscription-cancel-label"
      title="Cancellation"
    >
      <Button
        className="w-full sm:w-auto"
        data-parity="cancel-action"
        onClick={() => setConfirming(true)}
        size="sm"
        type="button"
        variant="destructive-outline"
      >
        {action}
      </Button>

      <ConfirmDialog
        cancelLabel={KEEP_COACHING_LABEL}
        confirmDisabled={cancelling}
        confirmLabel={cancelling ? CANCELLING_LABEL : action}
        description={cancelConfirmation(rule, subscription, now)}
        onConfirm={() => void confirm()}
        onOpenChange={changeConfirming}
        open={confirming}
        returnFocusTo={focusAfterCancelling}
        title={action}
        tone="destructive"
      >
        {problem && (
          <InlineProblem data-parity="cancel-problem" role="alert">
            {problem}
          </InlineProblem>
        )}
      </ConfirmDialog>
    </SettingsRow>
  );
}

function PaymentMethodRow({ paymentProblem }: { paymentProblem: boolean }) {
  const { open, opening, problem } = usePaymentMethodPortal();

  return (
    <SettingsRow
      data-parity="subscription-payment-method"
      labelId="subscription-payment-label"
      problem={
        (paymentProblem || problem) && (
          <div className="grid gap-1">
            {paymentProblem && (
              <InlineProblem data-parity="payment-problem" role="status">
                {PAYMENT_PROBLEM_LINE}
              </InlineProblem>
            )}
            {problem && (
              <InlineProblem data-parity="payment-method-problem" role="alert">
                {problem}
              </InlineProblem>
            )}
          </div>
        )
      }
      title="Payment method"
    >
      <ManagePaymentMethodButton onOpen={() => void open()} opening={opening} />
    </SettingsRow>
  );
}

export function SubscriptionSection() {
  const { demoJourney, cancelSubscription } = useClientJourneys();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusAfterCancelling = useRef<HTMLElement | null>(null);

  const { subscription } = demoJourney;
  if (!subscription) return null;

  const now = new Date();
  const status = deriveStatus(subscription, now);
  if (status === 'ended') return null;

  const rule = cancellationRule(subscription, now);

  const recordCancellation = (cancelled: CoachingSubscription) => {
    cancelSubscription(demoJourney.callId, cancelled);
    if (cancelled.status !== 'cancelled' || !cancelled.periodEndsAt) return;

    focusAfterCancelling.current = headingRef.current;
    toast.success(cancelledToast(cancelled.periodEndsAt));
  };

  return (
    <SettingsSection
      headingId="subscription-heading"
      headingRef={headingRef}
      parityRoot="SubscriptionSection"
      title="Subscription"
      icon={
        <CreditCard
          aria-hidden="true"
          className="text-brand-secondary"
          size={18}
        />
      }
    >
      <SettingsRows>
        <SettingsRow
          data-parity="subscription-plan"
          labelId="subscription-plan-label"
          title={`${bundleLengthLabel(subscription.bundle)} of coaching`}
          description={planDescription(subscription, status)}
        />

        {rule !== 'none' && (
          <CancellationRow
            focusAfterCancelling={focusAfterCancelling}
            onCancelled={recordCancellation}
            rule={rule}
            subscription={subscription}
          />
        )}

        {status !== 'cancelled' && (
          <PaymentMethodRow paymentProblem={subscription.paymentProblem} />
        )}
      </SettingsRows>
    </SettingsSection>
  );
}
