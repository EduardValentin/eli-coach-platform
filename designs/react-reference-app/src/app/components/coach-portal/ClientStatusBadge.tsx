import type { ComponentProps } from 'react';
import type { ClientStatus, ClientStatusTone } from '../../domain/clientStatus';
import { Badge } from '../ui/badge';

type BadgeVariant = ComponentProps<typeof Badge>['variant'];

const TONE_VARIANTS: Record<ClientStatusTone, BadgeVariant> = {
  neutral: 'secondary',
  pending: 'pending',
  info: 'brand-secondary',
  success: 'success',
  muted: 'muted',
};

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  return <Badge variant={TONE_VARIANTS[status.tone]}>{status.label}</Badge>;
}
