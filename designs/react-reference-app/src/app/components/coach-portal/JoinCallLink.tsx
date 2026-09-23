import { Video } from 'lucide-react';
import { RowActionLink } from '../RowActionButton';

export function JoinCallLink({ joinPath }: { joinPath: string }) {
  return (
    <RowActionLink to={joinPath} icon={Video} tone="brand">
      Join call
    </RowActionLink>
  );
}
