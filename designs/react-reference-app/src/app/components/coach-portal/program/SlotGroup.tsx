import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';
import type { Exercise } from '../../../context/TrainingContext';
import { MOVEMENT_PATTERN_LABELS } from '../../../domain/exercises';
import type { Session, Slot } from '../../../domain/program';
import { SINGLE_CARD_SLOTS, slotUnits, type Placement, type SessionEdits } from '../../../domain/sessionEditing';
import type { SlotPlan } from '../../../domain/splitTemplates';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { ExerciseCard } from './ExerciseCard';
import { DropSeparator, DropZone, EmptyDropTarget, PLAN_ROW, type DraggedItem, type SessionDropRules } from './sessionDnd';

type SlotGroupProps = {
  session: Session;
  plan: SlotPlan;
  library: readonly Exercise[];
  edits: SessionEdits;
  onChange: (session: Session) => void;
  onAdd: (slot: Slot) => void;
  onAddSubstitution: (rowId: string) => void;
};

function SupersetUnit({ children, onUngroup }: { children: ReactNode; onUngroup: () => void }) {
  return (
    <div className="overflow-hidden rounded-control border border-brand-secondary">
      <div className="flex items-center justify-between gap-2 bg-brand-secondary px-3 py-1.5 text-brand-secondary-foreground">
        <span className="text-label uppercase">Superset</span>
        <Button
          variant="ghost"
          size="xs"
          className="h-auto px-2 py-0.5 text-brand-secondary-foreground hover:bg-brand-secondary-hover hover:text-brand-secondary-foreground"
          onClick={onUngroup}
        >
          Ungroup
        </Button>
      </div>
      <div className="grid gap-2 p-2">{children}</div>
    </div>
  );
}

export function SlotGroup({ session, plan, library, edits, onChange, onAdd, onAddSubstitution }: SlotGroupProps) {
  const { slot, label, patterns } = plan;
  const units = slotUnits(session, slot);
  const addLabel = `Add exercise to ${label}`;
  const several = !SINGLE_CARD_SLOTS.includes(slot);
  const placeAt = (placement: Placement) => (dragged: DraggedItem) =>
    onChange(dragged.kind === PLAN_ROW ? edits.move(dragged.item.rowId, placement) : edits.add(dragged.item.exercise, placement));
  const rulesAt = (placement: Placement): SessionDropRules => ({ sessionId: session.id, onDrop: placeAt(placement) });
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
        onChange={onChange}
        onAddSubstitution={onAddSubstitution}
      />
    );
  };

  return (
    <section className="grid gap-2">
      <header className="flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-semibold text-text-primary">{`${slot} · ${label}`}</h4>
        {patterns.map(pattern => (
          <Badge key={pattern} tone="muted">
            {MOVEMENT_PATTERN_LABELS[pattern]}
          </Badge>
        ))}
        {several && units.length > 0 && (
          <Button variant="ghost" size="xs" className="ml-auto" aria-label={addLabel} onClick={() => onAdd(slot)}>
            <Plus aria-hidden="true" />
            Add
          </Button>
        )}
      </header>
      <DropZone rules={rulesAt({ slot })} className="rounded-control" activeClassName="bg-primary-soft">
        {units.length === 0 ? (
          <EmptyDropTarget rules={rulesAt({ slot })} addLabel={addLabel} onAdd={() => onAdd(slot)} />
        ) : (
          <div className="grid">
            {several && <DropSeparator rules={rulesAt({ slot, beforeRowId: units[0].rows[0].id })} />}
            {units.map((unit, index) => {
              const next = units[index + 1];
              return (
                <div key={unit.key} className="grid">
                  {unit.group === undefined ? (
                    card(unit.rows[0].id)
                  ) : (
                    <SupersetUnit onUngroup={() => onChange(edits.ungroup(unit.group as string))}>
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
