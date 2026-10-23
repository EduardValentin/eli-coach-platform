import type { ReactNode } from 'react';
import { Plus, Sparkles, X } from 'lucide-react';
import type { Exercise } from '../../../context/TrainingContext';
import { withField, type LastSetTechnique, type Row } from '../../../domain/program';
import { MAX_SUBSTITUTIONS } from '../../../domain/substitutions';
import { exerciseNameOf } from '../../program-view/programView';
import { LABEL_CLASS } from '../../typography';
import { WatchVideoButton } from '../../WatchVideoButton';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Textarea } from '../../ui/textarea';
import { cn } from '../../ui/utils';
import { DropZone, LIBRARY_EXERCISE, type DraggedItem, type SessionDropRules } from './sessionDnd';

type ExerciseRowDetailsProps = {
  row: Row;
  exercise: Exercise | undefined;
  library: readonly Exercise[];
  substitutionDrop: SessionDropRules;
  onChange: (row: Row) => void;
  onAddSubstitution: () => void;
  onRemoveSubstitution: (exerciseId: string) => void;
  onSuggestSubstitutions: () => void;
};

const TECHNIQUE_LABELS: Record<LastSetTechnique, string> = { none: 'None', 'drop-set': 'Drop set', 'rest-pause': 'Rest-pause' };

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid content-start gap-1.5">
      <span className={LABEL_CLASS}>{label}</span>
      {children}
    </label>
  );
}

function acceptsSubstitution(dragged: DraggedItem): boolean {
  return dragged.kind === LIBRARY_EXERCISE && dragged.item.exercise.type === 'resistance';
}

function Substitutions({ row, exercise, library, substitutionDrop, onAddSubstitution, onRemoveSubstitution, onSuggestSubstitutions }: ExerciseRowDetailsProps) {
  const nameOf = (id: string) => exerciseNameOf(library.find(item => item.id === id));
  const room = row.substitutions.length < MAX_SUBSTITUTIONS;
  return (
    <DropZone rules={substitutionDrop} accepts={acceptsSubstitution} className="rounded-field" activeClassName="ring-2 ring-primary/40">
      <fieldset className="grid gap-2">
        <legend className={cn(LABEL_CLASS, 'mb-1.5')}>Substitutions</legend>
        {row.substitutions.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {row.substitutions.map(id => (
              <li key={id} className="flex items-center gap-1 rounded-full border border-border bg-surface-base py-0.5 pr-0.5 pl-3 text-sm text-text-primary">
                {nameOf(id)}
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Remove ${nameOf(id)}`}
                  onClick={() => onRemoveSubstitution(id)}
                >
                  <X aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        {room && (
          <div className="flex flex-wrap gap-1">
            <Button variant="outline" size="xs" onClick={onAddSubstitution}>
              <Plus aria-hidden="true" />
              Add substitution
            </Button>
            {exercise && (
              <Button variant="ghost" size="xs" onClick={onSuggestSubstitutions}>
                <Sparkles aria-hidden="true" />
                Suggest
              </Button>
            )}
          </div>
        )}
      </fieldset>
    </DropZone>
  );
}

export function ExerciseRowDetails(props: ExerciseRowDetailsProps) {
  const { row, exercise, onChange } = props;
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <WatchVideoButton name={exercise.name} videoUrl={exercise.videoUrl} />
          )}
        </div>
      </div>
    </>
  );
}
