import { Badge } from '../ui/badge';
import type {
  Subscription,
  SubscriptionTier,
} from '../../context/TrainingContext';

const TIER_LABEL: Record<SubscriptionTier, string> = {
  '1-month': '1 month',
  '3-months': '3 months',
  '6-months': '6 months',
};

interface SubscriptionBadgeProps {
  subscription: Subscription;
}

export function SubscriptionBadge({ subscription }: SubscriptionBadgeProps) {
  const { tier, status } = subscription;
  return (
    <Badge variant={status === 'active' ? 'success' : 'muted'}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {TIER_LABEL[tier]} · {status === 'active' ? 'Active' : 'Expired'}
    </Badge>
  );
}
