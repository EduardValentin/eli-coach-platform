import { useId, useState, type Ref } from 'react';
import { useDrag } from 'react-dnd';
import { ArrowDown, ArrowUp, ChevronDown, GripVertical, Link2, Link2Off, RotateCcw, Trash2 } from 'lucide-react';
import type { Exercise } from '../../../context/TrainingContext';
import { positionLabel, setsSummary, type Row, type Session } from '../../../domain/program';
import { SINGLE_CARD_SLOTS, type SessionEdits } from '../../../domain/sessionEditing';
import { RowActionsMenu, type RowMenuAction } from '../../RowActionsMenu';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { cn } from '../../ui/utils';
import { ExerciseRowDetails } from './ExerciseRowDetails';
import { formatRest, repsSuffix } from './rowFields';
import { acceptsIntoSession, LIBRARY_EXERCISE, PLAN_ROW, useSessionDrop, type DraggedItem, type PlanRowItem } from './sessionDnd';
import { SetGrid } from './SetGrid';

type ExerciseCardProps = {
  session: Session;
  row: Row;
  exercise: Exercise | undefined;
  library: readonly Exercise[];
  edits: SessionEdits;
  onChange: (session: Session) => void;
  onAddSubstitution: (rowId: string) => void;
};

function menuActions({ row, edits, onChange }: Pick<ExerciseCardProps, 'row' | 'edits' | 'onChange'>): RowMenuAction[] {
  const { rows } = edits.session;
  const index = rows.findIndex(other => other.id === row.id);
  const grouping: RowMenuAction[] = SINGLE_CARD_SLOTS.includes(row.slot)
    ? []
    : row.supersetGroup
    ? [{ name: 'ungroup', label: 'Ungroup', icon: Link2Off, onSelect: () => onChange(edits.ungroup(row.supersetGroup as string)) }]
    : [{ name: 'superset', label: 'Superset with next', icon: Link2, disabled: !edits.canSupersetWithNext(row.id), onSelect: () => onChange(edits.supersetWithNext(row.id)) }];
  return [
    { name: 'up', label: 'Move up', icon: ArrowUp, disabled: index === 0, onSelect: () => onChange(edits.moveUp(row.id)) },
    { name: 'down', label: 'Move down', icon: ArrowDown, disabled: index === rows.length - 1, onSelect: () => onChange(edits.moveDown(row.id)) },
    ...grouping,
    { name: 'reset', label: 'Reset to block defaults', icon: RotateCcw, onSelect: () => onChange(edits.reset(row.id)) },
    { name: 'remove', label: 'Remove', icon: Trash2, tone: 'destructive', onSelect: () => onChange(edits.remove(row.id)) },
  ];
}

function dropHint(row: Row, itemType: string | symbol | null): string {
  if (!SINGLE_CARD_SLOTS.includes(row.slot)) return 'Superset';
  return itemType === PLAN_ROW ? 'Swap' : 'Add to the next group';
}

export function ExerciseCard({ session, row, exercise, library, edits, onChange, onAddSubstitution }: ExerciseCardProps) {
  const [setsOpen, setSetsOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const headingId = useId();
  const setsId = useId();
  const detailsId = useId();
  const position = positionLabel(session, row);
  const name = exercise?.name ?? 'Unknown exercise';
  const changeRow = (next: Row) => onChange(edits.replaceRow(next));

  const [{ isDragging }, drag] = useDrag<PlanRowItem, void, { isDragging: boolean }>(
    () => ({
      type: PLAN_ROW,
      item: { sessionId: session.id, rowId: row.id, label: `${position} ${name}` },
      collect: monitor => ({ isDragging: monitor.isDragging() }),
    }),
    [session.id, row.id, position, name],
  );

  const [{ isOver, canDrop, itemType }, drop] = useSessionDrop(
    {
      sessionId: session.id,
      onDrop: dragged => {
        if (dragged.kind === PLAN_ROW) onChange(edits.supersetOnto(dragged.item.rowId, row.id));
        else onChange(edits.addOnto(dragged.item.exercise, row.id));
      },
    },
    (dragged: DraggedItem, sessionId: string) => acceptsIntoSession(dragged, sessionId) && !(dragged.kind === PLAN_ROW && dragged.item.rowId === row.id),
  );
  const targeted = isOver && canDrop;

  return (
    <article
      ref={drop as unknown as Ref<HTMLElement>}
      aria-labelledby={headingId}
      className={cn(
        'relative scroll-mt-4 rounded-control border bg-card transition-[border-color,box-shadow,opacity] motion-reduce:transition-none lg:scroll-mt-[calc(var(--block-header-height)+4rem)]',
        {
          'border-brand-secondary ring-2 ring-brand-secondary/20': targeted,
          'border-border': !targeted,
          'opacity-40': isDragging,
        },
      )}
    >
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2 p-3">
        <span
          ref={drag as unknown as Ref<HTMLSpanElement>}
          aria-hidden="true"
          className="mt-0.5 flex h-7 shrink-0 cursor-grab touch-none items-center select-none text-text-secondary hover:text-text-primary active:cursor-grabbing"
        >
          <GripVertical size={16} />
        </span>
        <div className="grid min-w-0 flex-1 basis-48 gap-1">
          <h5 id={headingId} className="flex items-center gap-2.5">
            <span className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-surface-inverted px-1.5 text-xs font-semibold text-surface-inverted-foreground tabular-nums">
              {position}
            </span>{' '}
            <span className="min-w-0 text-sm font-medium text-text-primary">{name}</span>
            {exercise?.archivedAt && <Badge tone="muted">archived</Badge>}
          </h5>
          {exercise && (exercise.primaryMuscles.length > 0 || exercise.equipment.length > 0) && (
            <p className="flex flex-wrap items-center gap-1 pl-9.5">
              {exercise.primaryMuscles.map(muscle => (
                <Badge key={muscle} tone="muted">
                  {muscle}
                </Badge>
              ))}
              {exercise.equipment.length > 0 && <span className="text-xs text-text-secondary">{exercise.equipment.join(', ')}</span>}
            </p>
          )}
          <p className="flex flex-wrap gap-x-3 pl-9.5 text-sm text-text-secondary tabular-nums">
            <span>{setsSummary(row.sets, repsSuffix(exercise))}</span>
            <span>{`Rest ${formatRest(row.restSeconds)}`}</span>
          </p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="xs" aria-expanded={setsOpen} aria-controls={setsId} onClick={() => setSetsOpen(open => !open)}>
            Sets
            <ChevronDown aria-hidden="true" className={cn('transition-transform motion-reduce:transition-none', { 'rotate-180': setsOpen })} />
          </Button>
          <Button
            variant="ghost"
            size="xs"
            aria-label={`Details for ${name}`}
            aria-expanded={detailsOpen}
            aria-controls={detailsId}
            onClick={() => setDetailsOpen(open => !open)}
          >
            Details
            <ChevronDown aria-hidden="true" className={cn('transition-transform motion-reduce:transition-none', { 'rotate-180': detailsOpen })} />
          </Button>
          <RowActionsMenu label={`${name} actions`} actions={menuActions({ row, edits, onChange })} />
        </div>
      </div>
      {setsOpen && (
        <div id={setsId} className="border-t border-border-subtle px-3 py-3">
          <SetGrid row={row} exerciseName={name} repsSuffix={repsSuffix(exercise)} onChange={changeRow} />
        </div>
      )}
      {detailsOpen && (
        <div id={detailsId} className="grid gap-4 border-t border-border-subtle bg-surface-subtle px-3 py-4">
          <ExerciseRowDetails
            row={row}
            exercise={exercise}
            library={library}
            substitutionDrop={{
              sessionId: session.id,
              onDrop: dragged => dragged.kind === LIBRARY_EXERCISE && onChange(edits.addSubstitution(row.id, dragged.item.exercise.id)),
            }}
            onChange={changeRow}
            onAddSubstitution={() => onAddSubstitution(row.id)}
            onSuggestSubstitutions={() => onChange(edits.suggestSubstitutions(row.id))}
          />
        </div>
      )}
      {targeted && (
        <p aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-control bg-brand-secondary-soft">
          <span className="rounded-control bg-card px-3 py-1.5 text-sm font-medium text-brand-secondary shadow-raised">{dropHint(row, itemType)}</span>
        </p>
      )}
    </article>
  );
}
