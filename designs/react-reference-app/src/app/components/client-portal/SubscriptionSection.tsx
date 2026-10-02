import { useRef, useState, type RefObject } from 'react';
import { CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { useAppState } from '../../context/AppContext';
import { useClientJourneys } from '../../context/ClientJourneyContext';
import {
  cancellationRule,
  deriveStatus,
  endSubscription,
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
  DONE_LABEL,
  KEEP_COACHING_LABEL,
  PAYMENT_METHOD_LINE,
  type OfferedCancellation,
} from '../../utils/subscriptionCopy';
import { Button } from '../ui/button';
import { Alert } from '../ui/alert';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { SettingsRow, SettingsRows, SettingsSection } from '../SettingsSection';
import { ManagePaymentMethodButton } from './ManagePaymentMethodButton';
import { PaymentProblemNotice } from './PaymentProblemNotice';
import { usePaymentMethodPortal } from './usePaymentMethodPortal';

type OpenStatus = Exclude<SubscriptionStatus, 'ended'>;

function planDescription(
  subscription: CoachingSubscription,
  status: OpenStatus,
): string {
  const paid = `Paid ${formatJourneyDate(subscription.purchasedAt)}`;
  if (status === 'cancelled' && subscription.cancelledAt) {
    return `${paid} · cancelled ${formatJourneyDate(subscription.cancelledAt)}.`;
  }
  if (status === 'active' && subscription.day1) {
    return `${paid} · started ${formatJourneyDate(subscription.day1)}.`;
  }
  return `${paid} · starts when your program is ready.`;
}

function renewalRow(
  subscription: CoachingSubscription,
  status: OpenStatus,
): { title: string; description: string } | null {
  const endsAt = subscription.periodEndsAt;
  if (!endsAt) {
    if (status === 'cancelled') return null;
    return {
      title: 'Renews once your program starts',
      description: 'Your first term runs from your start date.',
    };
  }
  if (status === 'cancelled') {
    return {
      title: `Access until ${formatJourneyDate(endsAt)}`,
      description: "You won't be charged again.",
    };
  }
  return {
    title: `Renews on ${formatJourneyDate(endsAt)}`,
    description:
      'Your next term is charged on this date unless you cancel first.',
  };
}

type CancellationProblem = { message: string; alreadyEnded: boolean };

function cancellationProblem(error: unknown): CancellationProblem {
  if (!(error instanceof SubscriptionError)) {
    return {
      message: SUBSCRIPTION_ERROR_MESSAGES['cancel-unavailable'],
      alreadyEnded: false,
    };
  }

  return { message: error.message, alreadyEnded: error.code === 'already-ended' };
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
  const [problem, setProblem] = useState<CancellationProblem | null>(null);
  const now = new Date();
  const action = CANCEL_ACTION_LABELS[rule];
  const alreadyEnded = problem?.alreadyEnded ?? false;

  const changeConfirming = (open: boolean) => {
    setConfirming(open);
    if (open) return;

    setProblem(null);
    if (alreadyEnded) onCancelled(endSubscription(subscription, new Date()));
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
        cancelLabel={alreadyEnded ? DONE_LABEL : KEEP_COACHING_LABEL}
        confirmDisabled={cancelling || alreadyEnded}
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
          <Alert data-parity="cancel-problem">{problem.message}</Alert>
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
      description={PAYMENT_METHOD_LINE}
      labelId="subscription-payment-label"
      notice={
        (paymentProblem || problem) && (
          <div className="grid gap-2">
            {paymentProblem && <PaymentProblemNotice />}
            {problem && (
              <Alert data-parity="payment-method-problem">{problem}</Alert>
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
  const renewal = renewalRow(subscription, status);

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
      description="Your coaching plan, when it renews, and how to cancel."
    >
      <SettingsRows>
        <SettingsRow
          data-parity="subscription-plan"
          labelId="subscription-plan-label"
          title={`${bundleLengthLabel(subscription.bundle)} of coaching`}
          description={planDescription(subscription, status)}
        />

        {renewal && (
          <SettingsRow
            data-parity="subscription-renewal"
            labelId="subscription-renewal-label"
            title={renewal.title}
            description={renewal.description}
          />
        )}

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
