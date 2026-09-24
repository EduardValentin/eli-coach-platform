import type { JourneyStage } from '../../domain/journey';
import { Badge } from '../ui/badge';

export function CallStageBadge({ stage }: { stage: JourneyStage }) {
  if (stage === 'held') {
    return <Badge tone="muted">Call held</Badge>;
  }

  if (stage === 'payment-link-sent') {
    return <Badge tone="pending">Payment link sent</Badge>;
  }

  return <Badge tone="success">Paid</Badge>;
}
