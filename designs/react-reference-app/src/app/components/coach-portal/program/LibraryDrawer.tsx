import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { Exercise } from '../../../context/TrainingContext';
import {
  EXERCISE_ROLE_LABELS,
  MOVEMENT_PATTERN_LABELS,
  MOVEMENT_PATTERNS,
  MUSCLES,
  labelsOf,
  type Equipment,
  type ExerciseType,
  type Muscle,
  type MovementPattern,
} from '../../../domain/exercises';
import { pickableItems } from '../../../domain/libraryLifecycle';
import { roleForSlot, type Slot } from '../../../domain/program';
import type { RowTarget } from '../../../domain/programEditing';
import { wrapTabWithin } from '../../../utils/focusTrap';
import { MultiSelect } from '../../MultiSelect';
import { SearchField } from '../../SearchField';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Switch } from '../../ui/switch';
import { useIsDesktop } from '../../ui/use-desktop';
import { cn } from '../../ui/utils';

type LibraryDrawerProps = {
  target: RowTarget;
  slot?: Slot;
  library: readonly Exercise[];
  equipment: readonly Equipment[];
  onPick: (exerciseId: string) => void;
  onClose: () => void;
};

const MUSCLE_LABELS = labelsOf(MUSCLES);

function typeFor(target: RowTarget): ExerciseType {
  return target.field === 'mobility' ? 'mobility' : 'resistance';
}

function toggled<Value extends string>(values: readonly Value[], value: Value): Value[] {
  return values.includes(value) ? values.filter(other => other !== value) : [...values, value];
}

function detailsOf(exercise: Exercise): string {
  const pattern = exercise.pattern ? MOVEMENT_PATTERN_LABELS[exercise.pattern] : 'no pattern';
  const equipment = exercise.equipment.length > 0 ? exercise.equipment.join(', ') : 'no equipment';
  return `${pattern} · ${equipment}`;
}

function anyOf<Value>(chosen: readonly Value[], values: readonly Value[]): boolean {
  return chosen.length === 0 || values.some(value => chosen.includes(value));
}

export function LibraryDrawer({ target, slot, library, equipment, onPick, onClose }: LibraryDrawerProps) {
  const isDesktop = useIsDesktop();
  const aside = useRef<HTMLElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [patterns, setPatterns] = useState<MovementPattern[]>([]);
  const [muscles, setMuscles] = useState<Muscle[]>([]);
  const [onlyHers, setOnlyHers] = useState(true);
  const needle = query.trim().toLowerCase();
  const type = typeFor(target);

  useEffect(() => {
    search.current?.focus();
  }, []);

  useEffect(() => {
    const keepKeyboardInDrawer = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) onClose();
      if (event.key === 'Tab' && !isDesktop) wrapTabWithin(aside.current, event);
    };
    document.addEventListener('keydown', keepKeyboardInDrawer);
    return () => document.removeEventListener('keydown', keepKeyboardInDrawer);
  }, [isDesktop, onClose]);

  const shown = pickableItems(library)
    .filter(exercise => exercise.archivedAt === undefined && exercise.type === type)
    .filter(exercise => exercise.name.toLowerCase().includes(needle))
    .filter(exercise => anyOf(patterns, exercise.pattern ? [exercise.pattern] : []))
    .filter(exercise => anyOf(muscles, exercise.primaryMuscles))
    .filter(exercise => !onlyHers || exercise.equipment.every(item => equipment.includes(item)));

  return (
    <>
      {!isDesktop && <div aria-hidden="true" className="fixed inset-0 z-40 bg-overlay-medium" data-parity="drawer-backdrop" onClick={onClose} />}
      <aside
        ref={aside}
        aria-label="Exercise library"
        className={cn('flex w-80 shrink-0 flex-col gap-3 overflow-y-auto border-border bg-card p-4', {
          'border-l': isDesktop,
          'fixed inset-y-0 right-0 z-50 shadow-drawer': !isDesktop,
        })}
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-text-primary">Exercise library</h2>
          <Button onClick={onClose} variant="ghost" size="icon-sm" aria-label="Close exercise library">
            <X size={18} />
          </Button>
        </div>
        <SearchField ref={search} size="sm" aria-label="Search exercises" placeholder="Search exercises" value={query} onChange={event => setQuery(event.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          {type === 'resistance' && (
            <MultiSelect label="Pattern" selected={patterns} options={MOVEMENT_PATTERNS} labels={MOVEMENT_PATTERN_LABELS} onToggle={value => setPatterns(toggled(patterns, value))} />
          )}
          <MultiSelect label="Muscle" selected={muscles} options={MUSCLES} labels={MUSCLE_LABELS} onToggle={value => setMuscles(toggled(muscles, value))} />
        </div>
        <label className="flex items-center gap-2 text-sm text-text-primary">
          <Switch checked={onlyHers} onCheckedChange={setOnlyHers} aria-label="Only her equipment" />
          Only her equipment
        </label>
        {shown.length === 0 ? (
          <p className="text-sm text-text-secondary">No exercises match.</p>
        ) : (
          <ul aria-label="Exercises" className="grid gap-1">
            {shown.map(exercise => (
              <li key={exercise.id} className="grid gap-1 rounded-field px-2 py-1.5 hover:bg-surface-quiet">
                <button
                  type="button"
                  aria-label={`${exercise.name} · ${detailsOf(exercise)}`}
                  onClick={() => onPick(exercise.id)}
                  className="rounded-sm text-left text-sm text-text-primary outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <span className="font-medium">{exercise.name}</span>
                  <span className="block text-xs text-text-secondary">
                    {detailsOf(exercise)}
                  </span>
                </button>
                <span className="flex flex-wrap gap-1">
                  {exercise.role && <Badge tone="muted">{EXERCISE_ROLE_LABELS[exercise.role]}</Badge>}
                  {target.field === 'exercise' && slot && exercise.role && exercise.role !== roleForSlot(slot) && (
                    <Badge tone="pending">{`Role ${EXERCISE_ROLE_LABELS[exercise.role]} in slot ${slot}`}</Badge>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </>
  );
}
