import type { ComponentProps } from 'react';
import type { ClientStatus, ClientStatusTone } from '../../domain/clientStatus';
import { Badge } from '../ui/badge';

type BadgeTone = ComponentProps<typeof Badge>['tone'];

const BADGE_TONES: Record<ClientStatusTone, BadgeTone> = {
  neutral: 'secondary',
  pending: 'pending',
  info: 'brand-secondary',
  success: 'success',
  muted: 'muted',
};

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  return <Badge tone={BADGE_TONES[status.tone]}>{status.label}</Badge>;
}
