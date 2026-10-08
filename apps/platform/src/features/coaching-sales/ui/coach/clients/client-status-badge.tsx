import { Badge } from "@eli-coach-platform/ui/primitives";

import {
  CLIENT_STATUS_LABELS,
  clientStatusTone,
  type ClientStatusTone,
} from "~/features/coaching-sales/public/client-status";
import type { ClientStatus } from "~/features/coaching-sales/public/coach-clients";

const BADGE_TONES = {
  neutral: "secondary",
  pending: "pending",
  info: "brand-secondary",
  success: "success",
  muted: "muted",
} as const satisfies Record<ClientStatusTone, string>;

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  return (
    <Badge
      data-parity-root="ClientStatusBadge"
      tone={BADGE_TONES[clientStatusTone(status)]}
    >
      {CLIENT_STATUS_LABELS[status]}
    </Badge>
  );
}
