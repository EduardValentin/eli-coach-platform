import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, Link2, Link2Off, RotateCcw, Trash2 } from 'lucide-react';
import type { Exercise } from '../../../context/TrainingContext';
import type { Equipment } from '../../../domain/exercises';
import type { LastSetTechnique, Row } from '../../../domain/program';
import { substitutionsFor } from '../../../domain/programSuggestions';
import { LABEL_CLASS } from '../../typography';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Textarea } from '../../ui/textarea';
import { withField } from './rowFields';

export type RowActions = {
  moveUp?: () => void;
  moveDown?: () => void;
  superset?: () => void;
  splitSuperset?: () => void;
  reset: () => void;
  remove: () => void;
};

type ExerciseRowDetailsProps = {
  row: Row;
  exercise: Exercise | undefined;
  library: readonly Exercise[];
  equipment: readonly Equipment[];
  actions: RowActions;
  onChange: (row: Row) => void;
  onPickSubstitution: (index: number) => void;
};

const TECHNIQUE_LABELS: Record<LastSetTechnique, string> = { none: 'None', 'drop-set': 'Drop set', 'rest-pause': 'Rest-pause' };
const SUBSTITUTION_SLOTS = [0, 1];

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid content-start gap-1.5">
      <span className={LABEL_CLASS}>{label}</span>
      {children}
    </label>
  );
}

function Substitutions({ row, exercise, library, equipment, onChange, onPickSubstitution }: Omit<ExerciseRowDetailsProps, 'actions'>) {
  const nameOf = (id: string | undefined) => library.find(item => item.id === id)?.name ?? 'None yet';
  return (
    <fieldset className="grid gap-2">
      <legend className={LABEL_CLASS}>Substitutions</legend>
      <ul className="flex flex-wrap gap-2">
        {SUBSTITUTION_SLOTS.map(index => (
          <li key={index} className="flex items-center gap-1 rounded-full border border-border bg-surface-base py-0.5 pr-1 pl-3 text-sm">
            {nameOf(row.substitutions[index])}
            <Button variant="ghost" size="xs" aria-label={`Change substitution ${index + 1}`} onClick={() => onPickSubstitution(index)}>
              Change
            </Button>
          </li>
        ))}
      </ul>
      <Button
        variant="outline"
        size="xs"
        className="justify-self-start"
        disabled={!exercise}
        onClick={() => exercise && onChange(withField(row, 'substitutions', substitutionsFor(exercise, library, equipment)))}
      >
        Suggest again
      </Button>
    </fieldset>
  );
}

function ActionBar({ actions }: { actions: RowActions }) {
  return (
    <div className="flex flex-wrap gap-1 border-t border-border pt-3">
      <Button variant="ghost" size="xs" disabled={!actions.moveUp} onClick={actions.moveUp}>
        <ArrowUp aria-hidden="true" />
        Move up
      </Button>
      <Button variant="ghost" size="xs" disabled={!actions.moveDown} onClick={actions.moveDown}>
        <ArrowDown aria-hidden="true" />
        Move down
      </Button>
      {actions.splitSuperset ? (
        <Button variant="ghost" size="xs" onClick={actions.splitSuperset}>
          <Link2Off aria-hidden="true" />
          Split superset
        </Button>
      ) : (
        actions.superset && (
          <Button variant="ghost" size="xs" onClick={actions.superset}>
            <Link2 aria-hidden="true" />
            Superset with next
          </Button>
        )
      )}
      <Button variant="ghost" size="xs" onClick={actions.reset}>
        <RotateCcw aria-hidden="true" />
        Reset to block defaults
      </Button>
      <Button variant="ghost" size="xs" className="text-destructive" onClick={actions.remove}>
        <Trash2 aria-hidden="true" />
        Remove
      </Button>
    </div>
  );
}

export function ExerciseRowDetails(props: ExerciseRowDetailsProps) {
  const { row, exercise, actions, onChange } = props;
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Detail label="Warm-up sets">
          <Input size="sm" value={row.warmUpSets ?? ''} onChange={event => onChange(withField(row, 'warmUpSets', event.target.value || undefined))} />
        </Detail>
        <Detail label="Suggested weight (kg)">
          <Input
            size="sm"
            type="number"
            min={0}
            placeholder="Choose a weight that matches the RIR"
            value={row.weightKg ?? ''}
            onChange={event => onChange(withField(row, 'weightKg', event.target.value === '' ? undefined : Number(event.target.value)))}
          />
        </Detail>
        <Detail label="Tempo">
          <Input
            size="sm"
            placeholder="Lower for 3 seconds, pause 1 second at the bottom"
            value={row.tempo ?? ''}
            onChange={event => onChange(withField(row, 'tempo', event.target.value || undefined))}
          />
        </Detail>
        <div className="grid content-start gap-1.5">
          <span aria-hidden="true" className={LABEL_CLASS}>
            Last-set technique
          </span>
          <Select value={row.lastSetTechnique} onValueChange={value => onChange(withField(row, 'lastSetTechnique', value as LastSetTechnique))}>
            <SelectTrigger size="sm" aria-label="Last-set technique">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TECHNIQUE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-1.5">
        <span aria-hidden="true" className={LABEL_CLASS}>
          Progression
        </span>
        <Select
          value={row.progression.kind}
          onValueChange={value => onChange(withField(row, 'progression', value === 'custom' ? { kind: 'custom', text: '' } : { kind: 'double' }))}
        >
          <SelectTrigger size="sm" aria-label="Progression" className="sm:w-60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="double">Double progression</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
        {row.progression.kind === 'custom' && (
          <Textarea
            aria-label="Custom progression"
            value={row.progression.text}
            onChange={event => onChange(withField(row, 'progression', { kind: 'custom', text: event.target.value }))}
          />
        )}
      </div>
      <Substitutions {...props} />
      <div className="grid gap-1.5">
        <Detail label="Cues">
          <Textarea value={row.cues} onChange={event => onChange(withField(row, 'cues', event.target.value))} />
        </Detail>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="ghost"
            size="xs"
            disabled={!exercise}
            onClick={() => exercise && onChange({ ...row, cues: exercise.cues, touched: row.touched.filter(field => field !== 'cues') })}
          >
            Reset from library
          </Button>
          {exercise?.videoUrl && (
            <a href={exercise.videoUrl} target="_blank" rel="noreferrer" className="text-sm text-primary underline-offset-4 hover:underline">
              Watch the video
            </a>
          )}
        </div>
      </div>
      <ActionBar actions={actions} />
    </>
  );
}
