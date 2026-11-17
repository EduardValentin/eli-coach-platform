import { CloudOff } from 'lucide-react';
import type { ProgramLoadOutcome } from '../../services/programLoadService';
import { DeadEndPanel } from '../ErrorPage';
import { Button } from '../ui/button';
import { ProgramViewerSkeleton } from './ProgramViewerSkeleton';

type PendingLoad = Exclude<ProgramLoadOutcome, 'ready'>;

type ProgramLoadStateProps = { load: PendingLoad; onRetry: () => void; headingLevel?: 'h1' | 'h2' };

export function ProgramLoadState({ load, onRetry, headingLevel = 'h2' }: ProgramLoadStateProps) {
  if (load === 'loading') return <ProgramViewerSkeleton />;
  return (
    <DeadEndPanel
      icon={CloudOff}
      title="The program couldn't be loaded"
      headingLevel={headingLevel}
      description="Nothing is lost. Check your connection and try again."
      action={
        <Button variant="outline" size="md" onClick={onRetry}>
          Try again
        </Button>
      }
    />
  );
}
