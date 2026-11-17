import { CloudOff } from 'lucide-react';
import type { ProgramLoadOutcome } from '../../services/programLoadService';
import { DeadEndPanel } from '../ErrorPage';
import { Button } from '../ui/button';
import { ProgramViewerSkeleton } from './ProgramViewerSkeleton';

type PendingLoad = Exclude<ProgramLoadOutcome, 'ready'>;

export function ProgramLoadState({ load, onRetry }: { load: PendingLoad; onRetry: () => void }) {
  if (load === 'loading') return <ProgramViewerSkeleton />;
  return (
    <DeadEndPanel
      icon={CloudOff}
      title="The program couldn't be loaded"
      headingLevel="h2"
      description="Nothing is lost. Check your connection and try again."
      action={
        <Button variant="outline" size="md" onClick={onRetry}>
          Try again
        </Button>
      }
    />
  );
}
