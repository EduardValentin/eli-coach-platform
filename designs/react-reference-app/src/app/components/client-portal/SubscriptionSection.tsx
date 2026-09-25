import { useState } from 'react';
import { CreditCard } from 'lucide-react';
import { useClientJourneys } from '../../context/ClientJourneyContext';
import {
  canStartWork,
  workStartDate,
  deriveStatus,
  type CoachingSubscription,
  type SubscriptionStatus,
} from '../../domain/coachingSubscription';
import { cancelSubscription as sendCancellation } from '../../services/subscriptionService';
import {
  bundleLengthLabel,
  formatJourneyDate,
} from '../../utils/journeyLabels';
import { Button } from '../ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { SettingsRow, SettingsRows, SettingsSection } from '../SettingsSection';

const REFUND_CANCEL_LABEL = 'Cancel and get a full refund';

const CANCEL_LABEL = 'Cancel subscription';

const REFUND_CONFIRMATION =
  "You'll get a full refund and your access ends right away.";

function cancellationFacts(periodEndsAt: Date | undefined): string {
  const access = periodEndsAt
    ? `your access stays until ${formatJourneyDate(periodEndsAt)}`
    : 'your access stays until the end of the coaching you paid for';

  return `You won't be charged again, there is no refund for the coaching already paid, and ${access}.`;
}

function refundFacts(subscription: CoachingSubscription): string {
  const deadline = workStartDate(subscription);
  const until = deadline ? `Until ${formatJourneyDate(deadline)} you` : 'You';

  return `${until} can cancel for a full refund. Your access ends right away.`;
}

function cancelAction(
  subscription: CoachingSubscription,
  now: Date,
): string | null {
  if (!canStartWork(subscription, now)) return REFUND_CANCEL_LABEL;

  return deriveStatus(subscription, now) === 'active' ? CANCEL_LABEL : null;
}

function planDescription(
  subscription: CoachingSubscription,
  status: Exclude<SubscriptionStatus, 'ended'>,
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
  status: Exclude<SubscriptionStatus, 'ended'>,
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

export function SubscriptionSection() {
  const { demoJourney, cancelSubscription } = useClientJourneys();
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const { subscription } = demoJourney;
  if (!subscription) return null;

  const now = new Date();
  const status = deriveStatus(subscription, now);
  if (status === 'ended') return null;

  const refundable = !canStartWork(subscription, now);
  const action = cancelAction(subscription, now);
  const renewal = renewalRow(subscription, status);

  const confirm = async () => {
    setCancelling(true);
    const cancelled = await sendCancellation(subscription, new Date());
    cancelSubscription(demoJourney.callId, cancelled.subscription);
    setCancelling(false);
    setConfirming(false);
  };

  return (
    <SettingsSection
      headingId="subscription-heading"
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
          labelId="subscription-plan-label"
          title={`${bundleLengthLabel(subscription.bundle)} of coaching`}
          description={planDescription(subscription, status)}
        />

        {renewal && (
          <SettingsRow
            labelId="subscription-renewal-label"
            title={renewal.title}
            description={renewal.description}
          />
        )}

        {action && (
          <SettingsRow
            labelId="subscription-cancel-label"
            title="Cancellation"
            description={
              refundable
                ? refundFacts(subscription)
                : cancellationFacts(subscription.periodEndsAt)
            }
          >
            <Button
              disabled={cancelling}
              onClick={() => setConfirming(true)}
              variant="destructive-outline"
              size="sm"
            >
              Cancel
            </Button>
          </SettingsRow>
        )}
      </SettingsRows>

      <AlertDialog onOpenChange={setConfirming} open={confirming}>
        <AlertDialogContent className="rounded-card sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{action ?? CANCEL_LABEL}</AlertDialogTitle>
            <AlertDialogDescription>
              {refundable
                ? REFUND_CONFIRMATION
                : cancellationFacts(subscription.periodEndsAt)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep my coaching</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void confirm()}
            >
              {action ?? CANCEL_LABEL}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsSection>
  );
}
