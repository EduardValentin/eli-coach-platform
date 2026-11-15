import { useRef, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import type { Exercise } from '../../../context/TrainingContext';
import { MOVEMENT_PATTERN_LABELS, type MovementPattern } from '../../../domain/exercises';
import { positionLabel, type Row, type Session, type Slot } from '../../../domain/program';
import { SINGLE_CARD_SLOTS, slotUnits, type Placement, type RowEdits } from '../../../domain/sessionEditing';
import { slotExercisePatterns, type SlotPlan } from '../../../domain/splitTemplates';
import { CheckboxChip } from '../../CheckboxChip';
import { ChoiceGroup, ChoiceOption } from '../../ChoiceGroup';
import { LABEL_CLASS } from '../../typography';
import { Button } from '../../ui/button';
import { cn } from '../../ui/utils';
import { useEditorAnnouncer } from './editorAnnouncer';
import { ExerciseCard, type RowFocus, type SlotTarget } from './ExerciseCard';
import { actionsTriggerIn, usePendingFocus } from './usePendingFocus';
import { DropSeparator, DropZone, EmptyDropTarget, PLAN_ROW, type DraggedItem, type SessionDropRules } from './sessionDnd';

type SlotGroupProps = {
  session: Session;
  plan: SlotPlan;
  choices: readonly MovementPattern[];
  onPatternsChange: (patterns: MovementPattern[]) => void;
  library: readonly Exercise[];
  edits: RowEdits;
  slots: readonly SlotTarget[];
  onChange: (session: Session) => void;
  onAdd: (slot: Slot) => void;
  onAddSubstitution: (rowId: string) => void;
};

type SupersetUnitProps = { positions: readonly string[]; onUngroup: () => void; children: ReactNode };

function SupersetUnit({ positions, onUngroup, children }: SupersetUnitProps) {
  return (
    <div className="rounded-control border-l-2 border-brand-secondary bg-brand-secondary-soft">
      <div className="flex items-center justify-between gap-2 py-2 pr-1 pl-3">
        <span className={cn(LABEL_CLASS, 'text-brand-secondary-ink')}>Superset</span>
        <Button variant="ghost" size="xs" className="text-brand-secondary-ink" onClick={onUngroup}>
          Ungroup
          <span className="sr-only">{` ${positions.join(' and ')}`}</span>
        </Button>
      </div>
      <div className="grid gap-2 px-2 pb-2">{children}</div>
    </div>
  );
}

const SINGLE_PATTERN_SLOTS: readonly Slot[] = ['A'];

type PatternPickerProps = { plan: SlotPlan; choices: readonly MovementPattern[]; onChange: (patterns: MovementPattern[]) => void };

function MainPatternPicker({ plan, choices, onChange }: PatternPickerProps) {
  return (
    <ChoiceGroup
      size="xs"
      aria-label={`${plan.label} pattern`}
      value={plan.patterns[0] ?? ''}
      onValueChange={value => onChange([value as MovementPattern])}
      className="w-auto"
    >
      {choices.map(pattern => (
        <ChoiceOption key={pattern} value={pattern}>
          {MOVEMENT_PATTERN_LABELS[pattern]}
        </ChoiceOption>
      ))}
    </ChoiceGroup>
  );
}

function PatternChips({ plan, choices, onChange }: PatternPickerProps) {
  const toggle = (pattern: MovementPattern, checked: boolean) =>
    onChange(choices.filter(choice => (choice === pattern ? checked : plan.patterns.includes(choice))));
  return (
    <fieldset className="flex flex-wrap items-center gap-2">
      <legend className="sr-only">{`${plan.label} patterns`}</legend>
      {choices.map(pattern => (
        <CheckboxChip
          key={pattern}
          size="compact"
          aria-label={MOVEMENT_PATTERN_LABELS[pattern]}
          checked={plan.patterns.includes(pattern)}
          onCheckedChange={checked => toggle(pattern, checked)}
        >
          {MOVEMENT_PATTERN_LABELS[pattern]}
        </CheckboxChip>
      ))}
      {plan.patterns.length === 0 && <span className="text-xs text-text-secondary">Any pattern</span>}
    </fieldset>
  );
}

function PatternText({ patterns }: { patterns: readonly MovementPattern[] }) {
  if (patterns.length === 0) return null;
  return (
    <p className="text-sm text-text-secondary">
      <span className="sr-only">Patterns: </span>
      {patterns.map(pattern => MOVEMENT_PATTERN_LABELS[pattern]).join(' · ')}
    </p>
  );
}

function PatternTags({ plan, choices, onChange }: PatternPickerProps) {
  if (choices.length === 0) return <PatternText patterns={plan.patterns} />;
  if (SINGLE_PATTERN_SLOTS.includes(plan.slot)) return <MainPatternPicker plan={plan} choices={choices} onChange={onChange} />;
  return <PatternChips plan={plan} choices={choices} onChange={onChange} />;
}

export function SlotGroup({ session, plan, choices, onPatternsChange, library, edits, slots, onChange, onAdd, onAddSubstitution }: SlotGroupProps) {
  const announce = useEditorAnnouncer();
  const section = useRef<HTMLElement>(null);
  const focusLater = usePendingFocus();
  const focus: RowFocus = {
    onRow: rowId => focusLater(() => actionsTriggerIn(`[data-row-id="${rowId}"]`)),
    onSlotAdd: () => focusLater(() => section.current?.querySelector<HTMLElement>('[data-slot-add]')),
  };
  const { slot, label } = plan;
  const units = slotUnits(session, slot);
  const heading = `${slot} · ${label}`;
  const several = !SINGLE_CARD_SLOTS.includes(slot);
  const placeAt = (placement: Placement) => (dragged: DraggedItem) =>
    onChange(dragged.kind === PLAN_ROW ? edits.move(dragged.item.rowId, placement) : edits.add(dragged.item.exercise, placement));
  const rulesAt = (placement: Placement): SessionDropRules => ({ sessionId: session.id, onDrop: placeAt(placement) });

  function ungroup(group: string, rows: readonly Row[]) {
    const positions = rows.map(row => positionLabel(session, row));
    onChange(edits.ungroup(group));
    focus.onRow(rows[0].id);
    announce(`${positions.join(' and ')} ungrouped`);
  }

  const card = (rowId: string) => {
    const row = session.rows.find(other => other.id === rowId);
    if (!row) return null;
    return (
      <ExerciseCard
        key={row.id}
        session={session}
        row={row}
        exercise={library.find(item => item.id === row.exerciseId)}
        library={library}
        edits={edits}
        slots={slots}
        focus={focus}
        onChange={onChange}
        onAddSubstitution={onAddSubstitution}
      />
    );
  };

  return (
    <section ref={section} className="grid gap-2">
      <header className="flex items-start gap-3">
        <div className="flex min-h-(--size-control-xs) min-w-0 flex-1 flex-wrap content-center items-center gap-x-3 gap-y-2">
          <h4 className="text-sm font-semibold text-text-primary">{heading}</h4>
          {units.length > 0 ? (
            <PatternText patterns={slotExercisePatterns(session, slot, library)} />
          ) : (
            <PatternTags plan={plan} choices={choices} onChange={onPatternsChange} />
          )}
        </div>
        {several && units.length > 0 && (
          <Button variant="ghost" size="icon-xs" aria-label={`Add exercise to ${heading}`} data-slot-add="" onClick={() => onAdd(slot)}>
            <Plus aria-hidden="true" />
          </Button>
        )}
      </header>
      <DropZone rules={rulesAt({ slot })} className="rounded-control" activeClassName="bg-primary-soft">
        {units.length === 0 ? (
          <EmptyDropTarget rules={rulesAt({ slot })} place={heading} onAdd={() => onAdd(slot)} />
        ) : (
          <div className="grid">
            {several && <DropSeparator rules={rulesAt({ slot, beforeRowId: units[0].rows[0].id })} />}
            {units.map((unit, index) => {
              const next = units[index + 1];
              const { group } = unit;
              return (
                <div key={unit.key} className="grid">
                  {group === undefined ? (
                    card(unit.rows[0].id)
                  ) : (
                    <SupersetUnit positions={unit.rows.map(row => positionLabel(session, row))} onUngroup={() => ungroup(group, unit.rows)}>
                      {unit.rows.map(row => card(row.id))}
                    </SupersetUnit>
                  )}
                  {several && <DropSeparator rules={rulesAt({ slot, beforeRowId: next?.rows[0].id })} />}
                </div>
              );
            })}
          </div>
        )}
      </DropZone>
    </section>
  );
}
