import { motion } from 'motion/react';
import { CreditCard } from 'lucide-react';
import {
  deriveStatus,
  type CoachingSubscription,
} from '../../domain/coachingSubscription';
import {
  bundleLengthLabel,
  formatJourneyDate,
  startPathLabel,
} from '../../utils/journeyLabels';

const PANEL_CLASS =
  'bg-white p-6 rounded-panel shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50';

function Reading({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
        {term}
      </dt>
      <dd className="mt-1 text-sm font-medium text-text-primary">{value}</dd>
    </div>
  );
}

function periodLine(
  subscription: CoachingSubscription,
  now: Date,
): { term: string; value: string } {
  const status = deriveStatus(subscription, now);
  const endsAt = subscription.periodEndsAt;

  if (!endsAt) return { term: 'Renews on', value: 'Once her program starts' };
  if (status === 'cancelled') {
    return { term: 'Ends on', value: formatJourneyDate(endsAt) };
  }
  if (status === 'ended') {
    return { term: 'Ended on', value: formatJourneyDate(endsAt) };
  }

  return { term: 'Renews on', value: formatJourneyDate(endsAt) };
}

export function SubscriptionPanel({
  subscription,
}: {
  subscription: CoachingSubscription;
}) {
  const now = new Date();
  const period = periodLine(subscription, now);

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${PANEL_CLASS} mb-8`}
      aria-labelledby="subscription-panel-heading"
    >
      <h2
        id="subscription-panel-heading"
        className="mb-4 flex items-center gap-2 font-serif text-lg font-semibold text-text-primary"
      >
        <CreditCard size={18} className="text-brand" aria-hidden="true" />
        Subscription
      </h2>

      <dl className="grid grid-cols-2 gap-5 lg:grid-cols-5">
        <Reading term="Bundle" value={bundleLengthLabel(subscription.bundle)} />
        <Reading
          term="Start"
          value={startPathLabel(subscription) ?? 'Immediate start'}
        />
        <Reading
          term="Payment date"
          value={formatJourneyDate(subscription.purchasedAt)}
        />
        <Reading
          term="Start date"
          value={
            subscription.day1
              ? formatJourneyDate(subscription.day1)
              : 'Not set yet'
          }
        />
        <Reading term={period.term} value={period.value} />
      </dl>
    </motion.section>
  );
}
