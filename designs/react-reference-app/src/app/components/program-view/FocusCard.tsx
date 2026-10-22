import { format } from 'date-fns';
import { Target } from 'lucide-react';
import type { ReactNode } from 'react';
import { BLOCK_TYPE_LABELS } from '../../domain/program';
import { nextCheckpoint } from '../../domain/programCalendar';
import { ClientWidget } from '../client-portal/ClientWidget';
import { BLOCK_SWATCH } from '../coach-portal/program/program-constants';
import { LABEL_CLASS, VALUE_CLASS } from '../typography';
import { Badge } from '../ui/badge';
import { cn } from '../ui/utils';
import { currentBlock, type ProgramView } from './programView';

type FocusCardProps = { view: ProgramView; action?: ReactNode };

function heroOf(view: ProgramView): string {
  const { position } = view;
  if (position.status === 'before') return 'Your program starts when version 1 is published';
  if (position.status === 'ended') return 'Your plan has ended, your coach is preparing the next version';
  return `Week ${position.weekOfPlan} of ${position.totalWeeks}`;
}

function Reading({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <dt className={LABEL_CLASS}>{label}</dt>
      <dd className={cn(VALUE_CLASS, 'tabular-nums')}>{value}</dd>
    </div>
  );
}

export function FocusCard({ view, action }: FocusCardProps) {
  const { dayOne, position } = view;
  const block = currentBlock(view);
  const inPlan = position.status === 'in-plan';
  const showCycle = view.program.cycleMode === 'adapted' && view.cycleDay !== null;

  return (
    <ClientWidget
      eyebrow={inPlan && block ? BLOCK_TYPE_LABELS[block.type] : 'Current focus'}
      icon={Target}
      hero={heroOf(view)}
      headingId="program-focus"
      action={action}
      className="relative overflow-hidden"
    >
      {block && <span aria-hidden="true" className={cn('absolute inset-x-0 top-0 h-1', BLOCK_SWATCH[block.type])} />}
      {inPlan && position.calibration && (
        <Badge tone="muted" className="mt-2">
          Calibration week
        </Badge>
      )}
      {inPlan && dayOne && (
        <dl className="mt-5 flex flex-wrap gap-x-10 gap-y-4 border-t border-border-subtle pt-4">
          <Reading label="Next check-in form" value={format(nextCheckpoint(dayOne, view.preferredWeekday, view.today), 'EEEE, d MMMM')} />
          {showCycle && <Reading label="Cycle day" value={`~${view.cycleDay} (estimate)`} />}
        </dl>
      )}
    </ClientWidget>
  );
}
