import { type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { CreditCard } from 'lucide-react';
import {
  deliveryDate,
  deriveStatus,
  type CoachingSubscription,
} from '../domain/coachingSubscription';
import {
  bundleLengthLabel,
  formatJourneyDate,
  startPathLabel,
} from '../utils/journeyLabels';
import { cn } from './ui/utils';
import { SectionEyebrow } from './SectionEyebrow';

export type SubscriptionPerspective = 'coach' | 'client';

const PANEL_CLASS =
  'rounded-panel border border-border/50 bg-card p-6 shadow-[0_2px_12px_rgb(0,0,0,0.03)]';

type Line = { term: string; value: string };

function Reading({ term, value }: Line) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
        {term}
      </dt>
      <dd className="mt-1 text-sm font-medium text-text-primary">{value}</dd>
    </div>
  );
}

function possessiveFor(perspective: SubscriptionPerspective): string {
  return perspective === 'coach' ? 'her' : 'your';
}

function startDateLine(
  subscription: CoachingSubscription,
  perspective: SubscriptionPerspective,
): Line {
  const planned = subscription.day1 ?? deliveryDate(subscription);

  return {
    term: 'Start date',
    value: planned
      ? formatJourneyDate(planned)
      : `When ${possessiveFor(perspective)} program is ready`,
  };
}

function periodLine(
  subscription: CoachingSubscription,
  now: Date,
  perspective: SubscriptionPerspective,
): Line {
  const status = deriveStatus(subscription, now);
  const endsAt = subscription.periodEndsAt;

  if (!endsAt) {
    return {
      term: 'Renews on',
      value: `Once ${possessiveFor(perspective)} program starts`,
    };
  }
  if (status === 'cancelled') {
    return { term: 'Ends on', value: formatJourneyDate(endsAt) };
  }
  if (status === 'ended') {
    return { term: 'Ended on', value: formatJourneyDate(endsAt) };
  }

  return { term: 'Renews on', value: formatJourneyDate(endsAt) };
}

export function SubscriptionSummary({
  subscription,
  perspective,
  headingId,
  className,
  children,
}: {
  subscription: CoachingSubscription;
  perspective: SubscriptionPerspective;
  headingId: string;
  className?: string;
  children?: ReactNode;
}) {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const now = new Date();
  const period = periodLine(subscription, now, perspective);
  const start = startDateLine(subscription, perspective);

  return (
    <motion.section
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      aria-labelledby={headingId}
      className={cn(PANEL_CLASS, className)}
    >
      {perspective === 'client' ? (
        <SectionEyebrow as="h2" className="mb-2" id={headingId}>
          Subscription
        </SectionEyebrow>
      ) : (
        <h2
          id={headingId}
          className="mb-4 flex items-center gap-2 font-serif text-lg font-semibold text-text-primary"
        >
          <CreditCard size={18} className="text-brand" aria-hidden="true" />
          Subscription
        </h2>
      )}

      <dl className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
        <Reading term="Bundle" value={bundleLengthLabel(subscription.bundle)} />
        <Reading
          term="Start"
          value={startPathLabel(subscription) ?? 'Immediate start'}
        />
        <Reading
          term="Payment date"
          value={formatJourneyDate(subscription.purchasedAt)}
        />
        <Reading term={start.term} value={start.value} />
        <Reading term={period.term} value={period.value} />
      </dl>

      {children}
    </motion.section>
  );
}
