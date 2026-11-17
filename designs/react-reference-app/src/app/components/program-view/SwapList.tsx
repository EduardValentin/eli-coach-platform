import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Exercise } from '../../context/TrainingContext';
import { counted } from '../../utils/counted';
import { cn } from '../ui/utils';
import { CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { ExerciseNameMark } from './ExerciseNameButton';
import { InlineTextButton } from './InlineTextButton';

const ROW_CLASS = 'my-1 flex min-h-12 w-full items-center justify-between gap-3 rounded-field text-left text-base font-medium text-text-primary';

type SwapAction = { kind: 'open'; onOpen: (opener: HTMLElement) => void } | { kind: 'static' };

type SwapRowProps = { swap: Exercise; action: SwapAction };

function SwapRow({ swap, action }: SwapRowProps) {
  const content = (
    <>
      <span className="grid gap-0.5">
        <span className="inline-flex items-center gap-2">
          <ExerciseNameMark exercise={swap} />
        </span>
        {swap.equipment.length > 0 && <span className="text-sm font-normal text-text-secondary">{swap.equipment.join(', ')}</span>}
      </span>
      {action.kind !== 'static' && <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-text-secondary" />}
    </>
  );
  if (action.kind === 'static') return <div className={ROW_CLASS}>{content}</div>;
  return (
    <button type="button" aria-haspopup="dialog" data-swap={swap.id} onClick={event => action.onOpen(event.currentTarget)} className={ROW_CLASS}>
      {content}
    </button>
  );
}

type SwapRowsProps = {
  label: string;
  swaps: readonly Exercise[];
  actionFor: (swap: Exercise) => SwapAction;
  trailingFor?: (swap: Exercise) => ReactNode;
};

export function SwapRows({ label, swaps, actionFor, trailingFor }: SwapRowsProps) {
  return (
    <ul aria-label={label} className="divide-y divide-border-subtle border-y border-border-subtle">
      {swaps.map(swap => (
        <li key={swap.id} className={cn({ 'flex items-center gap-2': trailingFor !== undefined })}>
          <SwapRow swap={swap} action={actionFor(swap)} />
          {trailingFor?.(swap)}
        </li>
      ))}
    </ul>
  );
}

export function SwapListTrigger({ exerciseName, count }: { exerciseName: string; count: number }) {
  return (
    <CollapsibleTrigger asChild>
      <InlineTextButton trailing="disclosure">
        {counted(count, 'swap')}
        <span className="sr-only">{` for ${exerciseName}`}</span>
      </InlineTextButton>
    </CollapsibleTrigger>
  );
}

type SwapListPanelProps = {
  exerciseName: string;
  swaps: readonly Exercise[];
  actionFor: (swap: Exercise) => SwapAction;
  note: ReactNode;
};

export function SwapListPanel({ exerciseName, swaps, actionFor, note }: SwapListPanelProps) {
  return (
    <CollapsibleContent>
      <SwapRows label={`Swaps for ${exerciseName}`} swaps={swaps} actionFor={actionFor} />
      <p className="pt-2 pb-1 text-sm text-text-secondary">{note}</p>
    </CollapsibleContent>
  );
}
