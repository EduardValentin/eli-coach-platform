import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { CreditCard } from 'lucide-react';
import { useClientJourneys } from '../../context/ClientJourneyContext';
import {
  canDeliverProgram,
  deliveryDate,
  deriveStatus,
  type CoachingSubscription,
} from '../../domain/coachingSubscription';
import { cancelSubscription as sendCancellation } from '../../services/subscriptionService';
import {
  bundleLengthLabel,
  formatJourneyDate,
  SUBSCRIPTION_STATUS_LABELS,
} from '../../utils/journeyLabels';
import { Button } from '../ThemeButton';
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

const PANEL_CLASS =
  'rounded-panel border border-border bg-card p-6 shadow-[0_2px_12px_rgb(0,0,0,0.03)]';

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

function cancelAction(subscription: CoachingSubscription, now: Date): string | null {
  if (!canDeliverProgram(subscription, now)) return REFUND_CANCEL_LABEL;

  return deriveStatus(subscription, now) === 'active' ? CANCEL_LABEL : null;
}

function Reading({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <dt className="text-caption font-bold uppercase tracking-widest text-muted-foreground">
        {term}
      </dt>
      <dd className="mt-1 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

function subscriptionReading(
  subscription: CoachingSubscription,
  now: Date,
): { term: string; value: string } {
  const status = deriveStatus(subscription, now);
  const delivery = deliveryDate(subscription);

  if (status === 'not-started' && delivery) {
    return { term: 'Starts on', value: formatJourneyDate(delivery) };
  }
  if (status === 'not-started') {
    return { term: 'Starts on', value: 'The day your program is ready' };
  }
  if (!subscription.periodEndsAt) {
    return { term: 'Renews on', value: 'Once your program starts' };
  }
  if (status === 'active') {
    return { term: 'Renews on', value: formatJourneyDate(subscription.periodEndsAt) };
  }

  return { term: 'Ends on', value: formatJourneyDate(subscription.periodEndsAt) };
}

export function SubscriptionSection() {
  const { demoJourney, cancelSubscription } = useClientJourneys();
  const prefersReducedMotion = useReducedMotion() ?? false;
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const { subscription } = demoJourney;
  if (!subscription) return null;

  const now = new Date();
  const status = deriveStatus(subscription, now);
  if (status === 'ended') return null;

  const refundable = !canDeliverProgram(subscription, now);
  const reading = subscriptionReading(subscription, now);
  const action = cancelAction(subscription, now);

  const confirm = async () => {
    setCancelling(true);
    const cancelled = await sendCancellation(subscription, new Date());
    cancelSubscription(demoJourney.callId, cancelled.subscription);
    setCancelling(false);
    setConfirming(false);
  };

  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      aria-labelledby="subscription-heading"
      className={PANEL_CLASS}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
    >
      <h2
        className="mb-4 flex items-center gap-2 font-serif text-lg font-semibold text-foreground"
        id="subscription-heading"
      >
        <CreditCard size={18} className="text-brand" aria-hidden="true" />
        Subscription
      </h2>

      <dl className="grid grid-cols-2 gap-5 sm:grid-cols-4">
        <Reading term="Bundle" value={bundleLengthLabel(subscription.bundle)} />
        <Reading term="Status" value={SUBSCRIPTION_STATUS_LABELS[status]} />
        <Reading
          term="Day 1"
          value={
            subscription.day1 ? formatJourneyDate(subscription.day1) : 'Not set yet'
          }
        />
        <Reading term={reading.term} value={reading.value} />
      </dl>

      {action && (
        <Button
          className="mt-6"
          disabled={cancelling}
          onClick={() => setConfirming(true)}
          variant="outline"
          width="full-below-sm"
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
    </motion.section>
  );
}
