import { type ReactNode } from 'react';
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
import { PortalWidget, type WidgetPresentation } from './PortalWidget';
import { Reading } from './Reading';

export type SubscriptionPerspective = WidgetPresentation;

type Line = { term: string; value: string };

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
  const now = new Date();
  const period = periodLine(subscription, now, perspective);
  const start = startDateLine(subscription, perspective);

  return (
    <PortalWidget
      presentation={perspective}
      title="Subscription"
      icon={
        <CreditCard
          aria-hidden="true"
          className="text-brand-secondary"
          size={18}
        />
      }
      headingId={headingId}
      className={className}
    >
      <dl className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
        <Reading
          as="dl-item"
          label="Bundle"
          value={bundleLengthLabel(subscription.bundle)}
        />
        <Reading
          as="dl-item"
          label="Start"
          value={startPathLabel(subscription) ?? 'Immediate start'}
        />
        <Reading
          as="dl-item"
          label="Payment date"
          value={formatJourneyDate(subscription.purchasedAt)}
        />
        <Reading as="dl-item" label={start.term} value={start.value} />
        <Reading as="dl-item" label={period.term} value={period.value} />
      </dl>

      {children}
    </PortalWidget>
  );
}
