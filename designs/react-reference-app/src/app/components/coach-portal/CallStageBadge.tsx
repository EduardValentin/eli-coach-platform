import type { JourneyStage } from '../../domain/journey';
import { Badge } from '../ui/badge';

export function CallStageBadge({ stage }: { stage: JourneyStage }) {
  if (stage === 'held') {
    return <Badge variant="muted">Call held</Badge>;
  }

  if (stage === 'payment-link-sent') {
    return <Badge variant="pending">Payment link sent</Badge>;
  }

  return <Badge variant="success">Paid</Badge>;
}
