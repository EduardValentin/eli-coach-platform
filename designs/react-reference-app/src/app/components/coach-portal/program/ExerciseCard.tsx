import { useId, useState, type Ref } from 'react';
import { useDrag } from 'react-dnd';
import { ArrowDown, ArrowUp, ChevronDown, Link2, Link2Off, RotateCcw, Trash2 } from 'lucide-react';
import type { Exercise } from '../../../context/TrainingContext';
import { positionLabel, setsSummary, type Row, type Session } from '../../../domain/program';
import { SINGLE_CARD_SLOTS, type RowEdits } from '../../../domain/sessionEditing';
import { RowActionsMenu, type RowMenuAction } from '../../RowActionsMenu';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { cn } from '../../ui/utils';
import { ExerciseRowDetails } from './ExerciseRowDetails';
import { PositionBadge } from '../../program-view/PositionBadge';
import { exerciseNameOf, repsSuffix } from '../../program-view/programView';
import { DragHandle, DRAGGABLE_CARD_CLASS, draggableCardState, DropOverlay } from './dndParts';
import { formatRest } from './rowFields';
import { acceptsIntoSession, LIBRARY_EXERCISE, PLAN_ROW, useSessionDrop, type DraggedItem, type PlanRowItem } from './sessionDnd';
import { SetGrid } from './SetGrid';

type ExerciseCardProps = {
  session: Session;
  row: Row;
  exercise: Exercise | undefined;
  library: readonly Exercise[];
  edits: RowEdits;
  onChange: (session: Session) => void;
  onAddSubstitution: (rowId: string) => void;
};

function groupingActions({ row, edits, onChange }: Pick<ExerciseCardProps, 'row' | 'edits' | 'onChange'>): RowMenuAction[] {
  if (SINGLE_CARD_SLOTS.includes(row.slot)) return [];
  const group = row.supersetGroup;
  if (group) return [{ name: 'ungroup', label: 'Ungroup', icon: Link2Off, onSelect: () => onChange(edits.ungroup(group)) }];
  return [{ name: 'superset', label: 'Superset with next', icon: Link2, disabled: !edits.canSupersetWithNext(row.id), onSelect: () => onChange(edits.supersetWithNext(row.id)) }];
}

function menuActions({ row, edits, onChange }: Pick<ExerciseCardProps, 'row' | 'edits' | 'onChange'>): RowMenuAction[] {
  const { rows } = edits.session;
  const index = rows.findIndex(other => other.id === row.id);
  return [
    { name: 'up', label: 'Move up', icon: ArrowUp, disabled: index === 0, onSelect: () => onChange(edits.moveUp(row.id)) },
    { name: 'down', label: 'Move down', icon: ArrowDown, disabled: index === rows.length - 1, onSelect: () => onChange(edits.moveDown(row.id)) },
    ...groupingActions({ row, edits, onChange }),
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
  const name = exerciseNameOf(exercise);
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
      className={cn(DRAGGABLE_CARD_CLASS, 'scroll-mt-4 lg:scroll-mt-[calc(var(--block-header-height)+4rem)]', draggableCardState({ targeted, dragging: isDragging }))}
    >
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2 p-3">
        <DragHandle handleRef={drag as unknown as Ref<HTMLSpanElement>} className="mt-0.5" />
        <div className="grid min-w-0 flex-1 basis-48 gap-1">
          <h5 id={headingId} className="flex items-center gap-2.5">
            <PositionBadge label={position} size="sm" />{' '}
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
            onRemoveSubstitution={exerciseId => onChange(edits.removeSubstitution(row.id, exerciseId))}
            onSuggestSubstitutions={() => onChange(edits.suggestSubstitutions(row.id))}
          />
        </div>
      )}
      {targeted && <DropOverlay>{dropHint(row, itemType)}</DropOverlay>}
    </article>
  );
}
