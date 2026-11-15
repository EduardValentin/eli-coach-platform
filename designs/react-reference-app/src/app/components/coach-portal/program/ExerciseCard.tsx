import { useId, type ReactNode, type Ref } from 'react';
import { useDrag } from 'react-dnd';
import { ArrowDown, ArrowUp, ChevronDown, CornerDownRight, Link2, RotateCcw, Trash2 } from 'lucide-react';
import type { Exercise } from '../../../context/TrainingContext';
import { positionLabel, setsBreakdown, type Row, type Session, type Slot } from '../../../domain/program';
import { counted } from '../../../utils/counted';
import { SINGLE_CARD_SLOTS, type RowEdits } from '../../../domain/sessionEditing';
import { RowActionsMenu, type RowMenuAction } from '../../RowActionsMenu';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../ui/collapsible';
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
    <dl className="mt-2 mb-0 flex flex-wrap items-baseline gap-y-1 pl-9.5 text-sm tabular-nums [grid-area:stats] sm:mb-3">
      {stats.map(stat => (
        <div key={stat.term} className="flex flex-wrap items-baseline gap-x-1.5 border-border-subtle pr-3 not-first:border-l not-first:pl-3">
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

const CARD_GRID_CLASS = cn(
  'grid grid-cols-[auto_auto_auto_minmax(0,1fr)_auto] items-start gap-x-3 px-3',
  '[grid-template-areas:"handle_info_info_info_menu"_"._stats_stats_stats_stats"_"._sets_details_._."_"setspanel_setspanel_setspanel_setspanel_setspanel"_"detailspanel_detailspanel_detailspanel_detailspanel_detailspanel"]',
  'sm:grid-cols-[auto_minmax(0,1fr)_auto_auto_auto]',
  'sm:[grid-template-areas:"handle_info_sets_details_menu"_"._stats_stats_stats_stats"_"setspanel_setspanel_setspanel_setspanel_setspanel"_"detailspanel_detailspanel_detailspanel_detailspanel_detailspanel"]',
);
const PANEL_CLASS = '-mx-3 border-t border-border-subtle px-3';

type DisclosureProps = { label: string; name: string; area: string; panelClassName: string; children: ReactNode };

function Disclosure({ label, name, area, panelClassName, children }: DisclosureProps) {
  return (
    <Collapsible className="contents">
      <CollapsibleTrigger asChild>
        <Button variant="disclosure" size="xs" className={cn('mt-2 mb-3 sm:mt-3 sm:mb-0', area)}>
          {label}
          <span className="sr-only">{` for ${name}`}</span>
          <ChevronDown aria-hidden="true" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className={cn(PANEL_CLASS, panelClassName)}>{children}</CollapsibleContent>
    </Collapsible>
  );
}

export function ExerciseCard({ session, row, exercise, library, edits, slots, focus, onChange, onAddSubstitution }: ExerciseCardProps) {
  const announce = useEditorAnnouncer();
  const headingId = useId();
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
      <div className={CARD_GRID_CLASS}>
        <DragHandle handleRef={drag as unknown as Ref<HTMLSpanElement>} className="mt-3.5 [grid-area:handle]" />
        <div className="mt-3 grid min-w-0 gap-1 [grid-area:info]">
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
        <div className="mt-3 [grid-area:menu]">
          <RowActionsMenu label={`${name} actions`} size="xs" actions={menuActions({ row, library, edits, slots, focus, onChange, name, announce })} />
        </div>
        <RowStats stats={rowStats(row, repsSuffix(exercise))} />
        <Disclosure label="Sets" name={name} area="[grid-area:sets]" panelClassName="py-3 [grid-area:setspanel]">
          <SetGrid row={row} exerciseName={name} repsSuffix={repsSuffix(exercise)} onChange={changeRow} />
        </Disclosure>
        <Disclosure label="Details" name={name} area="[grid-area:details]" panelClassName="grid grid-cols-[minmax(0,1fr)] gap-4 py-4 [grid-area:detailspanel]">
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
        </Disclosure>
      </div>
      {targeted && <DropOverlay>{dropHint(row, itemType)}</DropOverlay>}
    </article>
  );
}
