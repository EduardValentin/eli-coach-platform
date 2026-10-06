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
  subscriptionErrorMessage,
} from '../../services/subscriptionService';
import {
  bundleLengthLabel,
  formatJourneyDate,
} from '../../utils/journeyLabels';
import {
  CANCEL_ACTION_LABELS,
  CANCEL_ROW_ACTION_LABEL,
  CANCELLING_LABEL,
  cancelConfirmation,
  cancellationFacts,
  cancelledToast,
  CHANGE_ROW_ACTION_LABEL,
  KEEP_COACHING_LABEL,
  OPENING_PAYMENT_METHOD_LABEL,
  type OfferedCancellation,
} from '../../utils/subscriptionCopy';
import { Button } from '../ui/button';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { InlineProblem } from '../InlineProblem';
import { SettingsRow, SettingsRows, SettingsSection } from '../SettingsSection';
import { CardOnFileReading } from './CardOnFileReading';
import { PaymentMethodProblems } from './PaymentMethodProblems';
import { usePaymentMethodPortal } from './usePaymentMethodPortal';

const ROW_ACTION_CLASS = 'w-full sm:w-28';

const CANCELLATION_IDS = {
  title: 'subscription-cancel-label',
  description: 'subscription-cancel-description',
};

const PAYMENT_METHOD_IDS = {
  title: 'subscription-payment-label',
  card: 'subscription-payment-card',
  paymentProblem: 'subscription-payment-problem',
  handOffProblem: 'subscription-payment-method-problem',
};

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
      setProblem(subscriptionErrorMessage(error, 'cancel-unavailable'));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <SettingsRow
      data-parity="subscription-cancellation"
      description={cancellationFacts(rule, subscription, now)}
      descriptionId={CANCELLATION_IDS.description}
      labelId={CANCELLATION_IDS.title}
      title="Cancellation"
    >
      <Button
        aria-describedby={`${CANCELLATION_IDS.title} ${CANCELLATION_IDS.description}`}
        className={ROW_ACTION_CLASS}
        data-parity="cancel-action"
        onClick={() => setConfirming(true)}
        size="sm"
        type="button"
        variant="destructive-outline"
      >
        {CANCEL_ROW_ACTION_LABEL}
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

function PaymentMethodRow({
  subscription,
}: {
  subscription: CoachingSubscription;
}) {
  const { open, opening, problem } = usePaymentMethodPortal();
  const { paymentProblem } = subscription;
  const describedBy = [
    PAYMENT_METHOD_IDS.title,
    PAYMENT_METHOD_IDS.card,
    ...(paymentProblem ? [PAYMENT_METHOD_IDS.paymentProblem] : []),
    ...(problem ? [PAYMENT_METHOD_IDS.handOffProblem] : []),
  ].join(' ');

  return (
    <SettingsRow
      data-parity="subscription-payment-method"
      description={<CardOnFileReading card={subscription.cardOnFile} />}
      descriptionId={PAYMENT_METHOD_IDS.card}
      labelId={PAYMENT_METHOD_IDS.title}
      problem={
        (paymentProblem || problem) && (
          <div className="grid gap-1 pt-1">
            <PaymentMethodProblems
              handOffProblem={problem}
              lineAttributes={{
                paymentProblem: { id: PAYMENT_METHOD_IDS.paymentProblem },
                handOffProblem: { id: PAYMENT_METHOD_IDS.handOffProblem },
              }}
              subscription={subscription}
            />
          </div>
        )
      }
      title="Payment method"
    >
      <Button
        aria-busy={opening}
        aria-describedby={describedBy}
        className={ROW_ACTION_CLASS}
        data-parity="manage-payment-method"
        disabled={opening}
        onClick={() => void open()}
        size="sm"
        type="button"
        variant="outline"
      >
        {opening ? OPENING_PAYMENT_METHOD_LABEL : CHANGE_ROW_ACTION_LABEL}
      </Button>
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
          <PaymentMethodRow subscription={subscription} />
        )}
      </SettingsRows>
    </SettingsSection>
  );
}
