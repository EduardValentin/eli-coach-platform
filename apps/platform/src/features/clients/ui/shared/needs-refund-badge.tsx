import { Badge } from "~/shared/design-system/primitives";

const NEEDS_REFUND_LABEL = "Needs refund";

export function NeedsRefundBadge({ parity }: { parity: string }) {
  return (
    <Badge data-parity={parity} tone="pending">
      {NEEDS_REFUND_LABEL}
    </Badge>
  );
}
