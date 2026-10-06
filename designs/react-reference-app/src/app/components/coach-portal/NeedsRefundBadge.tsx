import { Badge } from '../ui/badge';

export const NEEDS_REFUND_LABEL = 'Needs refund';

export function NeedsRefundBadge({ parity }: { parity: string }) {
  return (
    <Badge tone="pending" data-parity={parity}>
      {NEEDS_REFUND_LABEL}
    </Badge>
  );
}
