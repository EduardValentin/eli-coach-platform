import { useState, type ReactNode, type Ref } from 'react';
import { useDrag } from 'react-dnd';
import { ArrowDown, ArrowUp, ChevronDown, CornerDownRight, Link2, RotateCcw, Trash2 } from 'lucide-react';
import type { Exercise } from '../../../context/TrainingContext';
import { positionLabel, type Row, type Session, type Slot } from '../../../domain/program';
import { SINGLE_CARD_SLOTS, type RowEdits } from '../../../domain/sessionEditing';
import { RowActionsMenu, type RowMenuAction } from '../../RowActionsMenu';
import { Button } from '../../ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../ui/collapsible';
import { cn } from '../../ui/utils';
import { useEditorAnnouncer } from './editorAnnouncer';
import { ExerciseRowDetails } from './ExerciseRowDetails';
import { ExerciseNameButton } from '../../program-view/ExerciseNameButton';
import { rowExerciseDetail } from '../../program-view/sessionExerciseDetails';
import { PositionBadge } from '../../program-view/PositionBadge';
import { exerciseNameOf, musclesAndEquipmentText, repsSuffix } from '../../program-view/programView';
import { rowTargets } from '../../program-view/targets';
import { TargetsSummary } from '../../program-view/TargetsSummary';
import { DragHandle, DRAGGABLE_CARD_CLASS, draggableCardState, DropOverlay } from './dndParts';
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

function dropHint(row: Row, itemType: string | symbol | null): string {
  if (!SINGLE_CARD_SLOTS.includes(row.slot)) return 'Superset';
  return itemType === PLAN_ROW ? 'Swap' : 'Add to the next group';
}

const CARD_GRID_CLASS = cn(
  'grid grid-cols-[auto_auto_auto_minmax(0,1fr)_auto] items-start gap-x-4 px-3',
  '[grid-template-areas:"handle_info_info_info_menu"_"._stats_stats_stats_stats"_"._sets_details_._."_"setspanel_setspanel_setspanel_setspanel_setspanel"_"detailspanel_detailspanel_detailspanel_detailspanel_detailspanel"]',
  'sm:grid-cols-[auto_minmax(0,1fr)_auto_auto_auto]',
  'sm:[grid-template-areas:"handle_info_sets_details_menu"_"._stats_stats_stats_stats"_"setspanel_setspanel_setspanel_setspanel_setspanel"_"detailspanel_detailspanel_detailspanel_detailspanel_detailspanel"]',
);
const PANEL_CLASS = '-mx-3 border-t border-border-subtle px-3';

type DisclosureProps = { label: string; name: string; area: string; panelClassName: string; onOpenChange?: (open: boolean) => void; children: ReactNode };

function Disclosure({ label, name, area, panelClassName, onOpenChange, children }: DisclosureProps) {
  return (
    <Collapsible className="contents" onOpenChange={onOpenChange}>
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
  const [setsOpen, setSetsOpen] = useState(false);
  const position = positionLabel(session, row);
  const name = exerciseNameOf(exercise);
  const facts = musclesAndEquipmentText(exercise);
  const changeRow = (next: Row) => onChange(edits.replaceRow(next));
  const detail = rowExerciseDetail({
    session,
    row,
    progression: row.progression.kind === 'custom' ? row.progression.text : '',
    findExercise: id => library.find(item => item.id === id),
  });

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
      aria-label={`${position} ${name}`}
      data-row-id={row.id}
      className={cn(DRAGGABLE_CARD_CLASS, draggableCardState({ targeted, dragging: isDragging }))}
    >
      <div className={CARD_GRID_CLASS}>
        <DragHandle handleRef={drag as unknown as Ref<HTMLSpanElement>} className="mt-3.5 [grid-area:handle]" />
        <div className="mt-3 grid min-w-0 gap-1 [grid-area:info]">
          <h5 className="flex items-center gap-2.5">
            <PositionBadge label={position} size="sm" tone="quiet" />{' '}
            <ExerciseNameButton exercise={exercise} detail={detail} weight="medium" size="compact" />
          </h5>
          {facts && <p className="pl-9.5 text-sm text-text-secondary">{facts}</p>}
        </div>
        <div className="mt-3 [grid-area:menu]">
          <RowActionsMenu label={`${name} actions`} size="xs" actions={menuActions({ row, library, edits, slots, focus, onChange, name, announce })} />
        </div>
        {!setsOpen && <TargetsSummary size="sm" items={rowTargets(row, repsSuffix(exercise))} className="mt-2 ml-9.5 [grid-area:stats] sm:mb-3" />}
        <Disclosure label="Sets" name={name} area="[grid-area:sets]" onOpenChange={setSetsOpen} panelClassName="py-3 [grid-area:setspanel]">
          <SetGrid row={row} exerciseName={name} repsSuffix={repsSuffix(exercise)} onChange={changeRow} />
        </Disclosure>
        <Disclosure label="Details" name={name} area="[grid-area:details]" panelClassName="grid grid-cols-[minmax(0,1fr)] gap-4 rounded-b-[calc(var(--radius-control)-1px)] bg-surface-subtle py-4 [grid-area:detailspanel]">
          <ExerciseRowDetails
            row={row}
            exercise={exercise}
            detail={detail}
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
