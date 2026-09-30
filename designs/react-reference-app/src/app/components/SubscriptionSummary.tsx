import { type ReactNode } from 'react';
import { CreditCard } from 'lucide-react';
import {
  deriveStatus,
  type CoachingSubscription,
} from '../domain/coachingSubscription';
import type { JourneyGender, JourneyPricing } from '../domain/journey';
import {
  bundleLengthLabel,
  clientPronouns,
  formatJourneyDate,
  IMMEDIATE_START_LABEL,
  REDUCED_PRICE_LABELS,
  startPathLabel,
} from '../utils/journeyLabels';
import { cn } from './ui/utils';
import { PortalWidget } from './PortalWidget';
import { Reading } from './Reading';

type SubscriptionAudience =
  | {
      perspective: 'coach';
      clientGender: JourneyGender;
      pricing: JourneyPricing;
    }
  | { perspective: 'client' };

type SubscriptionSummaryProps = SubscriptionAudience & {
  subscription: CoachingSubscription;
  headingId: string;
  className?: string;
  children?: ReactNode;
};

type Line = { term: string; value: string };

const READINGS_GRID_CLASS: Record<SubscriptionAudience['perspective'], string> =
  {
    coach: 'grid-cols-2 sm:grid-cols-3',
    client: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
  };

function possessiveFor(audience: SubscriptionAudience): string {
  return audience.perspective === 'coach'
    ? clientPronouns(audience.clientGender).possessive.lower
    : 'your';
}

function startProgramValue(subscription: CoachingSubscription): string {
  return subscription.day1 ? formatJourneyDate(subscription.day1) : '—';
}

function periodLine(
  subscription: CoachingSubscription,
  now: Date,
  ownerPossessive: string,
): Line {
  const status = deriveStatus(subscription, now);
  const endsAt = subscription.periodEndsAt;

  if (!endsAt) {
    return {
      term: 'Renews on',
      value: `Once ${ownerPossessive} program starts`,
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

export function SubscriptionSummary(props: SubscriptionSummaryProps) {
  const { subscription, headingId, className, children } = props;
  const now = new Date();
  const period = periodLine(subscription, now, possessiveFor(props));

  return (
    <PortalWidget
      presentation={props.perspective}
      title="Subscription"
      icon={
        <CreditCard
          aria-hidden="true"
          className="text-brand-secondary"
          size={18}
        />
      }
      headingId={headingId}
      parityRoot="SubscriptionSummary"
      className={className}
    >
      <dl className={cn('grid gap-5', READINGS_GRID_CLASS[props.perspective])}>
        <Reading
          as="dl-item"
          label="Bundle"
          value={bundleLengthLabel(subscription.bundle)}
          valueParity="subscription-bundle"
        />
        <Reading
          as="dl-item"
          label="Payment date"
          value={formatJourneyDate(subscription.purchasedAt)}
          valueParity="subscription-paid"
        />
        <Reading
          as="dl-item"
          label="Start"
          value={startPathLabel(subscription) ?? IMMEDIATE_START_LABEL}
          valueParity="subscription-start"
        />
        <Reading
          as="dl-item"
          label="Start program"
          value={startProgramValue(subscription)}
          valueParity="subscription-program-start"
        />
        <Reading
          as="dl-item"
          label={period.term}
          value={period.value}
          valueParity="subscription-renews"
        />
        {props.perspective === 'coach' && (
          <Reading
            as="dl-item"
            label="Reduced price"
            value={REDUCED_PRICE_LABELS[props.pricing]}
            valueParity="subscription-reduced-price"
          />
        )}
      </dl>

      {children}
    </PortalWidget>
  );
}
