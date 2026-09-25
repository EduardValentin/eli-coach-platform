import { Video } from 'lucide-react';
import { RowActionLink } from '../RowActionButton';

type JoinCallTone = 'default' | 'live';

const ROW_ACTION_TONE_BY_TONE: Record<JoinCallTone, 'default' | 'primary'> = {
  default: 'default',
  live: 'primary',
};

export function JoinCallLink({
  joinPath,
  tone,
}: {
  joinPath: string;
  tone: JoinCallTone;
}) {
  return (
    <RowActionLink
      to={joinPath}
      icon={Video}
      tone={ROW_ACTION_TONE_BY_TONE[tone]}
    >
      Join call
    </RowActionLink>
  );
}
