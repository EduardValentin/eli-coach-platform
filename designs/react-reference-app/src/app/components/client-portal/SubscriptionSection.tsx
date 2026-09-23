import { useState } from 'react';
import { SubscriptionSummary } from '../SubscriptionSummary';
import { useClientJourneys } from '../../context/ClientJourneyContext';
import {
  canDeliverProgram,
  deriveStatus,
  type CoachingSubscription,
} from '../../domain/coachingSubscription';
import { cancelSubscription as sendCancellation } from '../../services/subscriptionService';
import { formatJourneyDate } from '../../utils/journeyLabels';
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

function cancelAction(
  subscription: CoachingSubscription,
  now: Date,
): string | null {
  if (!canDeliverProgram(subscription, now)) return REFUND_CANCEL_LABEL;

  return deriveStatus(subscription, now) === 'active' ? CANCEL_LABEL : null;
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

  const refundable = !canDeliverProgram(subscription, now);
  const action = cancelAction(subscription, now);

  const confirm = async () => {
    setCancelling(true);
    const cancelled = await sendCancellation(subscription, new Date());
    cancelSubscription(demoJourney.callId, cancelled.subscription);
    setCancelling(false);
    setConfirming(false);
  };

  return (
    <SubscriptionSummary
      subscription={subscription}
      perspective="client"
      headingId="subscription-heading"
    >
      {action && (
        <Button
          className="mt-6 w-full sm:w-auto"
          disabled={cancelling}
          onClick={() => setConfirming(true)}
          variant="outline"
          size="lg"
        >
          {action}
        </Button>
      )}

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
            <AlertDialogAction onClick={() => void confirm()}>
              {action ?? CANCEL_LABEL}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SubscriptionSummary>
  );
}
