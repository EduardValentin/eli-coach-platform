import type { JourneyStage } from '../../domain/journey';
import { Badge } from '../ui/badge';

export function CallStageBadge({ stage }: { stage: JourneyStage }) {
  if (stage === 'held') {
    return (
      <Badge data-parity="sales-state" tone="muted">
        Call held
      </Badge>
    );
  }

  if (stage === 'payment-link-sent') {
    return (
      <Badge data-parity="sales-state" tone="pending">
        Payment link sent
      </Badge>
    );
  }

  return (
    <Badge data-parity="sales-state" tone="success">
      Paid
    </Badge>
  );
}
