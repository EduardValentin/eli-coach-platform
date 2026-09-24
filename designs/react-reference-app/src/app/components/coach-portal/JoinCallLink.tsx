import { Video } from 'lucide-react';
import { RowActionLink } from '../RowActionButton';

export function JoinCallLink({
  joinPath,
  live = false,
}: {
  joinPath: string;
  live?: boolean;
}) {
  return (
    <RowActionLink
      to={joinPath}
      icon={Video}
      tone={live ? 'primary' : 'default'}
    >
      Join call
    </RowActionLink>
  );
}
