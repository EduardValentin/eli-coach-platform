import { Plus } from 'lucide-react';
import type { Exercise } from '../../../context/TrainingContext';
import type { Equipment } from '../../../domain/exercises';
import { newId, SLOTS, type Block, type Row, type Session, type Slot } from '../../../domain/program';
import { resetRowDefaults } from '../../../domain/programDefaults';
import { emptyRow, estimatedMinutes } from '../../../domain/programSuggestions';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Switch } from '../../ui/switch';
import { cn } from '../../ui/utils';
import type { RowTarget } from './BlockWorkspace';
import type { RowActions } from './ExerciseRowDetails';
import { SessionRows } from './SessionRows';

type SessionCardProps = {
  session: Session;
  block: Block;
  expanded: boolean;
  onToggle: () => void;
  library: readonly Exercise[];
  equipment: readonly Equipment[];
  onChange: (session: Session) => void;
  onPickExercise: (target: RowTarget) => void;
};

const OVER_TARGET_MINUTES = 10;
const SUPERSET_SLOTS: readonly Slot[] = ['C', 'D'];

function slotForNewExercise(rows: Row[]): Slot {
  if (!rows.some(row => row.slot === 'A')) return 'A';
  return rows.some(row => row.slot === 'B') ? 'C' : 'B';
}

function withRowAdded(rows: Row[], row: Row): Row[] {
  const rank = SLOTS.indexOf(row.slot);
  const after = rows.reduce((last, other, at) => (SLOTS.indexOf(other.slot) <= rank ? at : last), -1);
  return [...rows.slice(0, after + 1), row, ...rows.slice(after + 1)];
}

function swapped(rows: Row[], index: number, other: number): Row[] {
  const next = [...rows];
  [next[index], next[other]] = [next[other], next[index]];
  return next;
}

function rowActions(session: Session, index: number, blockType: Block['type'], change: (rows: Row[]) => void): RowActions {
  const { rows } = session;
  const row = rows[index];
  const next = rows[index + 1];
  const canSuperset = SUPERSET_SLOTS.includes(row.slot) && next?.slot === row.slot;
  const groupOf = (group: string | undefined) => rows.filter(other => group !== undefined && other.supersetGroup === group);
  return {
    moveUp: index > 0 ? () => change(swapped(rows, index, index - 1)) : undefined,
    moveDown: next ? () => change(swapped(rows, index, index + 1)) : undefined,
    superset: canSuperset
      ? () => {
          const group = newId();
          change(rows.map((other, at) => (at === index || at === index + 1 ? { ...other, supersetGroup: group } : other)));
        }
      : undefined,
    splitSuperset:
      groupOf(row.supersetGroup).length > 1
        ? () => change(rows.map(other => (other.supersetGroup === row.supersetGroup ? { ...other, supersetGroup: undefined } : other)))
        : undefined,
    reset: () => change(rows.map((other, at) => (at === index ? resetRowDefaults(other, blockType) : other))),
    remove: () => change(rows.filter((_, at) => at !== index)),
  };
}

export function SessionCard({ session, block, expanded, onToggle, library, equipment, onChange, onPickExercise }: SessionCardProps) {
  const minutes = estimatedMinutes(session);
  const overTarget = minutes > block.targetMinutes + OVER_TARGET_MINUTES;
  const mobilityNames = session.warmUp.mobilityExerciseIds.map(id => library.find(item => item.id === id)?.name).filter(Boolean);
  const changeRows = (rows: Row[]) => onChange({ ...session, rows });

  function addRow(slot: Slot) {
    const row = emptyRow(block.type, slot);
    changeRows(withRowAdded(session.rows, row));
    onPickExercise({ sessionId: session.id, rowId: row.id, field: 'exercise' });
  }

  if (!expanded) {
    return (
      <h3>
        <button
          type="button"
          aria-expanded={false}
          onClick={onToggle}
          className="flex w-full flex-wrap items-baseline justify-between gap-2 rounded-field border border-border bg-surface-base px-4 py-3 text-left outline-none hover:bg-surface-quiet focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <span className="font-serif text-lg text-text-primary">{session.name}</span>
          <span className="text-sm tabular-nums text-text-secondary">{`${session.rows.length} exercises · ~${minutes} min`}</span>
        </button>
      </h3>
    );
  }

  return (
    <section className="grid gap-4 rounded-field border border-border bg-surface-base p-4">
      <h3 className="sr-only">{session.name}</h3>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Input
          aria-label="Session name"
          value={session.name}
          onChange={event => onChange({ ...session, name: event.target.value })}
          className="h-auto max-w-sm border-transparent px-1 font-serif text-xl text-text-primary hover:border-control-border-soft md:text-xl"
        />
        <p className={cn('flex gap-2 text-sm tabular-nums', { 'text-warning': overTarget, 'text-text-secondary': !overTarget })}>
          <span>{`~${minutes} min / ${block.targetMinutes}`}</span>
          {overTarget && <span>Over target</span>}
        </p>
      </header>
      <div className="grid gap-3 rounded-field bg-surface-subtle p-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
        <p className="flex flex-wrap items-center gap-2 text-sm text-text-primary">
          <span>{`Warm-up: ${mobilityNames.length > 0 ? mobilityNames.join(', ') : 'pick mobility exercises'}`}</span>
          <Button variant="ghost" size="xs" onClick={() => onPickExercise({ sessionId: session.id, rowId: '', field: 'mobility' })}>
            Choose mobility
          </Button>
        </p>
        <Input
          size="sm"
          aria-label="Warm-up sets note"
          value={session.warmUp.warmUpSetsNote}
          onChange={event => onChange({ ...session, warmUp: { ...session.warmUp, warmUpSetsNote: event.target.value } })}
          className="sm:w-56"
        />
        <label className="flex items-center gap-2 text-sm text-text-primary">
          <Switch checked={session.coolDown} onCheckedChange={coolDown => onChange({ ...session, coolDown })} />
          Cool-down
        </label>
      </div>
      <SessionRows
        session={session}
        library={library}
        equipment={equipment}
        actionsFor={index => rowActions(session, index, block.type, changeRows)}
        onChangeRow={row => changeRows(session.rows.map(other => (other.id === row.id ? row : other)))}
        onPickExercise={onPickExercise}
      />
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => addRow(slotForNewExercise(session.rows))}>
          <Plus aria-hidden="true" />
          Add exercise
        </Button>
        <Button variant="ghost" size="sm" onClick={() => addRow('D')}>
          <Plus aria-hidden="true" />
          Add core / finisher
        </Button>
      </div>
    </section>
  );
}
