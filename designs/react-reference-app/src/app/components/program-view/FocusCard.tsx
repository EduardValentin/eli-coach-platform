import { format } from 'date-fns';
import { Target } from 'lucide-react';
import type { ReactNode } from 'react';
import { BLOCK_TYPE_LABELS } from '../../domain/program';
import { nextCheckpoint } from '../../domain/programCalendar';
import { ClientWidget } from '../client-portal/ClientWidget';
import { currentBlock, type ProgramView } from './programView';

type FocusCardProps = { view: ProgramView; action?: ReactNode };

function heroOf(view: ProgramView): string {
  const { position } = view;
  if (position.status === 'before') return 'Your program starts when version 1 is published';
  if (position.status === 'ended') return 'Your plan has ended, your coach is preparing the next version';
  const block = currentBlock(view);
  const label = block ? BLOCK_TYPE_LABELS[block.type] : '';
  const calibration = position.calibration ? ' · calibration' : '';
  return `${label} · week ${position.weekOfPlan} of ${position.totalWeeks}${calibration}`;
}

export function FocusCard({ view, action }: FocusCardProps) {
  const { dayOne, position } = view;
  const showCycle = view.program.cycleMode === 'adapted' && view.cycleDay !== null;
  return (
    <ClientWidget eyebrow="Current focus" icon={Target} hero={heroOf(view)} headingId="program-focus" action={action}>
      {position.status === 'in-plan' && dayOne && (
        <div className="grid gap-1 text-sm text-text-secondary">
          <p>Next check-in form {format(nextCheckpoint(dayOne, view.preferredWeekday, view.today), 'EEEE, d MMMM')}</p>
          {showCycle && <p>Cycle day ~{view.cycleDay} (estimate)</p>}
        </div>
      )}
    </ClientWidget>
  );
}
