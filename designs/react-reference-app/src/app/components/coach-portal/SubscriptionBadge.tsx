import { cva } from 'class-variance-authority';
import { cn } from '../ui/utils';
import type { Subscription, SubscriptionTier } from '../../context/TrainingContext';

const TIER_LABEL: Record<SubscriptionTier, string> = {
  '1-month': '1 Month',
  '3-months': '3 Months',
  '6-months': '6 Months',
};

const badge = cva(
  'inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider',
  {
    variants: {
      status: {
        active: 'bg-success-soft text-success',
        expired: 'bg-muted text-muted-foreground',
      },
    },
    defaultVariants: { status: 'active' },
  },
);

interface SubscriptionBadgeProps {
  subscription: Subscription;
}

export function SubscriptionBadge({ subscription }: SubscriptionBadgeProps) {
  const { tier, status } = subscription;
  return (
    <span className={cn(badge({ status }))}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {TIER_LABEL[tier]} · {status === 'active' ? 'Active' : 'Expired'}
    </span>
  );
}
