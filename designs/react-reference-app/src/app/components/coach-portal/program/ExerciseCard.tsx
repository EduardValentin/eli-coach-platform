import type { ReactNode, Ref } from 'react';
import { useDrag } from 'react-dnd';
import { ArrowDown, ArrowUp, ChevronDown, CornerDownRight, Link2, RotateCcw, Trash2 } from 'lucide-react';
import { useAppState } from '../../../context/AppContext';
import type { Exercise } from '../../../context/TrainingContext';
import { formatRest, positionLabel, withField, type Row, type Session, type Slot } from '../../../domain/program';
import { blockSpan } from '../../../domain/programCalendar';
import { progressionContextOf, rowAtWeek, type ProgressionSchedule } from '../../../domain/programProgression';
import { SINGLE_CARD_SLOTS, type RowEdits } from '../../../domain/sessionEditing';
import { hasWeeklySetsAndCardio } from '../../../services/builderSessions';
import { RowActionsMenu, type RowMenuAction } from '../../RowActionsMenu';
import { Button } from '../../ui/button';
import { LABEL_CLASS } from '../../typography';
import { cn } from '../../ui/utils';
import { useEditorAnnouncer } from './editorAnnouncer';
import { ExerciseRowDetails } from './ExerciseRowDetails';
import { ExerciseNameButton } from '../../program-view/ExerciseNameButton';
import { rowExerciseDetail } from '../../program-view/sessionExerciseDetails';
import { PositionBadge } from '../../program-view/PositionBadge';
import { exerciseNameOf, musclesAndEquipmentText, repsSuffix } from '../../program-view/programView';
import { rowTargets, weekRangeTargets } from '../../program-view/targets';
import { DisclosureContent, DisclosureTrigger, TextDisclosureGroup } from '../../program-view/TextDisclosure';
import { TargetsSummary } from '../../program-view/TargetsSummary';
import { DragHandle, DRAGGABLE_CARD_CLASS, draggableCardState, DropOverlay } from './dndParts';
import { acceptsIntoSession, LIBRARY_EXERCISE, PLAN_ROW, useSessionDrop, type DraggedItem, type PlanRowItem } from './sessionDnd';
import { RowTextField } from './RowTextField';
import { parseRest, REST_PROBLEM } from './rowFields';
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
  schedule: ProgressionSchedule;
  onChange: (session: Session) => void;
  onAddSubstitution: (rowId: string) => void;
};

type MenuContext = Pick<ExerciseCardProps, 'row' | 'library' | 'edits' | 'slots' | 'focus' | 'onChange'> & { name: string; announce: (message: string) => void; resettable: boolean };

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
  const { row, edits, focus, onChange, name, announce, resettable } = context;
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
    ...(resettable ? [{ name: 'reset', label: 'Reset to block defaults', icon: RotateCcw, onSelect: () => onChange(edits.reset(row.id)) }] : []),
    { name: 'remove', label: 'Remove', icon: Trash2, tone: 'destructive', onSelect: remove },
  ];
}

function dropHint(row: Row, itemType: string | symbol | null): string {
  if (!SINGLE_CARD_SLOTS.includes(row.slot)) return 'Superset';
  return itemType === PLAN_ROW ? 'Swap' : 'Add to the next group';
}

const CARD_GRID_CLASS = cn(
  'grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-4 px-3',
  '[grid-template-areas:"handle_info_menu"_"._stats_stats"_"._toggles_toggles"_"panel_panel_panel"]',
  'sm:grid-cols-[auto_minmax(0,1fr)_auto_auto]',
  'sm:[grid-template-areas:"handle_info_toggles_menu"_"._stats_stats_stats"_"panel_panel_panel_panel"]',
);

type PanelName = 'sets' | 'details';
type CardPanel = { name: PanelName; label: string; content: ReactNode };
type PanelTriggersProps = { panels: readonly CardPanel[]; exerciseName: string };

function PanelTriggers({ panels, exerciseName }: PanelTriggersProps) {
  return (
    <div className="mt-2 mb-3 flex flex-wrap gap-x-1 gap-y-4 [grid-area:toggles] sm:mt-3 sm:mb-0">
      {panels.map(panel => (
        <DisclosureTrigger key={panel.name} value={panel.name}>
          <Button variant="disclosure" size="xs" data-panel-trigger={panel.name}>
            {panel.label}
            <span className="sr-only">{` for ${exerciseName}`}</span>
            <ChevronDown aria-hidden="true" />
          </Button>
        </DisclosureTrigger>
      ))}
    </div>
  );
}

function OpenPanel({ panels }: Pick<PanelTriggersProps, 'panels'>) {
  return panels.map(panel => (
    <DisclosureContent key={panel.name} value={panel.name}>
      <div
        data-panel={panel.name}
        className="-mx-3 grid grid-cols-[minmax(0,1fr)] gap-4 rounded-b-[calc(var(--radius-control)-1px)] border-t border-border-subtle bg-surface-subtle px-3 py-4 [grid-area:panel]"
      >
        {panel.content}
      </div>
    </DisclosureContent>
  ));
}

function RestField({ row, onChange }: { row: Row; onChange: (row: Row) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border-subtle pt-3">
      <span aria-hidden="true" className={cn(LABEL_CLASS, 'flex h-(--size-control-md) items-center')}>
        Rest between sets
      </span>
      <RowTextField
        className="w-20"
        label="Rest between sets"
        value={row.restSeconds}
        format={formatRest}
        parse={parseRest}
        problem={REST_PROBLEM}
        onCommit={seconds => onChange(withField(row, 'restSeconds', seconds))}
      />
    </div>
  );
}

export function ExerciseCard({ session, row, exercise, library, edits, slots, focus, schedule, onChange, onAddSubstitution }: ExerciseCardProps) {
  const announce = useEditorAnnouncer();
  const weeklySets = hasWeeklySetsAndCardio(useAppState().appState.builderSessions);
  const progression = progressionContextOf(schedule, exercise);
  const firstWeek = rowAtWeek(row, 1, progression);
  const position = positionLabel(session, row);
  const name = exerciseNameOf(exercise);
  const facts = musclesAndEquipmentText(exercise);
  const changeRow = (next: Row) => onChange(edits.replaceRow(next));
  const detail = rowExerciseDetail({
    session,
    row: firstWeek,
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
  const setsPanel: CardPanel = {
    name: 'sets',
    label: 'Sets',
    content: (
      <>
        <SetGrid row={row} exercise={exercise} schedule={schedule} exerciseName={name} onChange={changeRow} />
        <RestField row={row} onChange={changeRow} />
      </>
    ),
  };
  const detailsPanel: CardPanel = {
    name: 'details',
    label: 'Details',
    content: (
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
    ),
  };
  const panels = weeklySets ? [setsPanel, detailsPanel] : [detailsPanel];
  const weekRange = weeklySets ? weekRangeTargets(row, progression, blockSpan(schedule.blocks, schedule.blockIndex).startWeek) : [];

  return (
    <article
      data-parity-root="ExerciseCard"
      ref={drop as unknown as Ref<HTMLElement>}
      aria-label={`${position} ${name}`}
      data-row-id={row.id}
      className={cn(DRAGGABLE_CARD_CLASS, draggableCardState({ targeted, dragging: isDragging }))}
    >
      <TextDisclosureGroup>
        <div data-parity="exercise-card-grid" className={CARD_GRID_CLASS}>
          <DragHandle handleRef={drag as unknown as Ref<HTMLSpanElement>} className="mt-3.5 [grid-area:handle]" />
          <div data-parity="exercise-card-info" className="mt-3 grid min-w-0 gap-1 [grid-area:info]">
            <h5 className="flex items-center gap-2.5">
              <PositionBadge label={position} size="sm" />{' '}
              <ExerciseNameButton exercise={exercise} detail={detail} weight="medium" size="compact" />
            </h5>
            {facts && <p data-parity="exercise-card-facts" className="pl-9.5 text-sm text-text-secondary">{facts}</p>}
          </div>
          <TargetsSummary size="sm" items={[...rowTargets(firstWeek, repsSuffix(exercise)), ...weekRange]} className="mt-2 ml-9.5 [grid-area:stats] sm:mb-3" />
          <PanelTriggers panels={panels} exerciseName={name} />
          <div className="mt-3 [grid-area:menu]">
            <RowActionsMenu label={`${name} actions`} size="xs" actions={menuActions({ row, library, edits, slots, focus, onChange, name, announce, resettable: weeklySets })} />
          </div>
          <OpenPanel panels={panels} />
        </div>
      </TextDisclosureGroup>
      {targeted && <DropOverlay>{dropHint(row, itemType)}</DropOverlay>}
    </article>
  );
}
