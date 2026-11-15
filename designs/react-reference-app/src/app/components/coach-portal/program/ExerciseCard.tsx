import { useId, useState, type ReactNode, type Ref } from 'react';
import { useDrag } from 'react-dnd';
import { ArrowDown, ArrowUp, ChevronDown, CornerDownRight, Link2, RotateCcw, Trash2 } from 'lucide-react';
import type { Exercise } from '../../../context/TrainingContext';
import { positionLabel, setsBreakdown, type Row, type Session, type Slot } from '../../../domain/program';
import { counted } from '../../../utils/counted';
import { SINGLE_CARD_SLOTS, type RowEdits } from '../../../domain/sessionEditing';
import { RowActionsMenu, type RowMenuAction } from '../../RowActionsMenu';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { cn } from '../../ui/utils';
import { useEditorAnnouncer } from './editorAnnouncer';
import { ExerciseRowDetails } from './ExerciseRowDetails';
import { PositionBadge } from '../../program-view/PositionBadge';
import { RirValue } from '../../program-view/RirValue';
import { exerciseNameOf, repsSuffix } from '../../program-view/programView';
import { DragHandle, DRAGGABLE_CARD_CLASS, draggableCardState, DropOverlay } from './dndParts';
import { formatRest } from './rowFields';
import { acceptsIntoSession, LIBRARY_EXERCISE, PLAN_ROW, useSessionDrop, type DraggedItem, type PlanRowItem } from './sessionDnd';
import { SetGrid } from './SetGrid';

export type SlotTarget = { slot: Slot; label: string };
export type RowFocus = { onRow: (rowId: string) => void; onSlotAdd: () => void };

type ExerciseCardProps = {
  session: Session;
  row: Row;
  exercise: Exercise | undefined;
  library: readonly Exercise[];
  edits: RowEdits;
  slots: readonly SlotTarget[];
  focus: RowFocus;
  onChange: (session: Session) => void;
  onAddSubstitution: (rowId: string) => void;
};

type MenuContext = Pick<ExerciseCardProps, 'row' | 'library' | 'edits' | 'slots' | 'focus' | 'onChange'> & { name: string; announce: (message: string) => void };

function groupingActions({ row, library, edits, focus, onChange, name, announce }: MenuContext): RowMenuAction[] {
  if (SINGLE_CARD_SLOTS.includes(row.slot)) return [];
  const { rows } = edits.session;
  const next = rows[rows.findIndex(other => other.id === row.id) + 1];
  const nextName = exerciseNameOf(library.find(item => item.id === next?.exerciseId));
  return [
    {
      name: 'superset',
      label: 'Superset with next',
      icon: Link2,
      disabled: !edits.canSupersetWithNext(row.id),
      onSelect: () => {
        onChange(edits.supersetWithNext(row.id));
        focus.onRow(row.id);
        announce(`${name} and ${nextName} grouped as a superset`);
      },
    },
  ];
}

function moveToSlotActions({ row, edits, slots, focus, onChange, name, announce }: MenuContext): RowMenuAction[] {
  const { rows } = edits.session;
  const open = (target: SlotTarget) =>
    target.slot !== row.slot && !(SINGLE_CARD_SLOTS.includes(target.slot) && rows.some(other => other.slot === target.slot));
  return slots.filter(open).map(target => ({
    name: `move-to-${target.slot}`,
    label: `Move to ${target.slot} · ${target.label}`,
    icon: CornerDownRight,
    onSelect: () => {
      onChange(edits.move(row.id, { slot: target.slot }));
      focus.onRow(row.id);
      announce(`${name} moved to ${target.slot} · ${target.label}`);
    },
  }));
}

function menuActions(context: MenuContext): RowMenuAction[] {
  const { row, edits, focus, onChange, name, announce } = context;
  const slotRows = edits.session.rows.filter(other => other.slot === row.slot);
  const index = slotRows.findIndex(other => other.id === row.id);
  const move = (direction: 'up' | 'down') => {
    onChange(direction === 'up' ? edits.moveUp(row.id) : edits.moveDown(row.id));
    focus.onRow(row.id);
    announce(`${name} moved ${direction}`);
  };
  const remove = () => {
    const neighbour = slotRows[index + 1] ?? slotRows[index - 1];
    onChange(edits.remove(row.id));
    if (neighbour) focus.onRow(neighbour.id);
    else focus.onSlotAdd();
    announce(`${name} removed`);
  };
  return [
    { name: 'up', label: 'Move up', icon: ArrowUp, disabled: index === 0, onSelect: () => move('up') },
    { name: 'down', label: 'Move down', icon: ArrowDown, disabled: index === slotRows.length - 1, onSelect: () => move('down') },
    ...moveToSlotActions(context),
    ...groupingActions(context),
    { name: 'reset', label: 'Reset to block defaults', icon: RotateCcw, onSelect: () => onChange(edits.reset(row.id)) },
    { name: 'remove', label: 'Remove', icon: Trash2, tone: 'destructive', onSelect: remove },
  ];
}

type Stat = { term: string; value: ReactNode };

function rowStats(row: Row, repsSuffix: string): Stat[] {
  const { warmUp, working, reps, rir } = setsBreakdown(row.sets, repsSuffix);
  if (warmUp + working === 0) return [{ term: 'Sets', value: 'None yet' }];
  return [
    ...(warmUp > 0 ? [{ term: 'Warm-up', value: counted(warmUp, 'set') }] : []),
    ...(working > 0 ? [{ term: 'Working', value: reps ? `${counted(working, 'set')} × ${reps}` : `${counted(working, 'set')}, varied` }] : []),
    ...(rir ? [{ term: 'RIR', value: <RirValue rir={rir} /> }] : []),
    { term: 'Rest', value: formatRest(row.restSeconds) },
  ];
}

function RowStats({ stats }: { stats: readonly Stat[] }) {
  return (
    <dl className="flex basis-full flex-wrap items-baseline gap-y-1 pl-16.5 text-sm tabular-nums">
      {stats.map(stat => (
        <div key={stat.term} className="flex items-baseline gap-1.5 border-border-subtle pr-3 not-first:border-l not-first:pl-3">
          <dt className="text-text-secondary">{stat.term}</dt>
          <dd className="font-semibold text-text-primary">{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function dropHint(row: Row, itemType: string | symbol | null): string {
  if (!SINGLE_CARD_SLOTS.includes(row.slot)) return 'Superset';
  return itemType === PLAN_ROW ? 'Swap' : 'Add to the next group';
}

type DisclosureProps = { label: string; name: string; open: boolean; controls: string; onToggle: () => void };

function DisclosureButton({ label, name, open, controls, onToggle }: DisclosureProps) {
  return (
    <Button variant="ghost" size="xs" aria-expanded={open} aria-controls={open ? controls : undefined} onClick={onToggle}>
      {label}
      <span className="sr-only">{` for ${name}`}</span>
      <ChevronDown aria-hidden="true" className={cn('transition-transform motion-reduce:transition-none', { 'rotate-180': open })} />
    </Button>
  );
}

export function ExerciseCard({ session, row, exercise, library, edits, slots, focus, onChange, onAddSubstitution }: ExerciseCardProps) {
  const [setsOpen, setSetsOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const announce = useEditorAnnouncer();
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
      data-row-id={row.id}
      className={cn(DRAGGABLE_CARD_CLASS, draggableCardState({ targeted, dragging: isDragging }))}
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
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <DisclosureButton label="Sets" name={name} open={setsOpen} controls={setsId} onToggle={() => setSetsOpen(open => !open)} />
          <DisclosureButton label="Details" name={name} open={detailsOpen} controls={detailsId} onToggle={() => setDetailsOpen(open => !open)} />
          <RowActionsMenu label={`${name} actions`} size="xs" actions={menuActions({ row, library, edits, slots, focus, onChange, name, announce })} />
        </div>
        <RowStats stats={rowStats(row, repsSuffix(exercise))} />
      </div>
      {setsOpen && (
        <div id={setsId} className="border-t border-border-subtle px-3 py-3">
          <SetGrid row={row} exerciseName={name} repsSuffix={repsSuffix(exercise)} onChange={changeRow} />
        </div>
      )}
      {detailsOpen && (
        <div id={detailsId} className="grid gap-4 border-t border-border-subtle px-3 py-4">
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
