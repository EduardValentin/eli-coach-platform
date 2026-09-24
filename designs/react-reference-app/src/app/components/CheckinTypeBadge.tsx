import { Badge } from './ui/badge';
import type { CheckIn } from '../context/CheckinContext';

const TYPE_LABEL: Record<CheckIn['type'], string> = {
  recurring: 'Recurring',
  'ad-hoc': 'Ad-hoc',
};

export function CheckinTypeBadge({ type }: { type: CheckIn['type'] }) {
  return (
    <Badge tone={type === 'ad-hoc' ? 'pending' : 'muted'}>
      {TYPE_LABEL[type]}
    </Badge>
  );
}
