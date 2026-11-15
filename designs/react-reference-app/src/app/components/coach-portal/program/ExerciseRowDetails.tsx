import { useId, type ReactNode } from 'react';
import { Plus, RotateCcw, Sparkles } from 'lucide-react';
import type { Exercise } from '../../../context/TrainingContext';
import { withField, type LastSetTechnique, type Row } from '../../../domain/program';
import { MAX_SUBSTITUTIONS } from '../../../domain/substitutions';
import { exerciseNameOf } from '../../program-view/programView';
import { IconActionButton } from '../../IconActionButton';
import { RemovableChip } from '../../RemovableChip';
import { LABEL_CLASS } from '../../typography';
import { WatchVideoButton } from '../../WatchVideoButton';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Textarea } from '../../ui/textarea';
import { cn } from '../../ui/utils';
import { LIBRARY_TARGET_CLASS, useIsLibraryTarget } from './libraryTarget';
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

type DetailProps = { label: string; actions?: ReactNode; children: (labelId: string) => ReactNode };

function Detail({ label, actions, children }: DetailProps) {
  const labelId = useId();
  return (
    <div className="grid min-w-0 content-start gap-1.5">
      {actions ? (
        <div className="flex min-h-8 items-center gap-2">
          <span id={labelId} className={LABEL_CLASS}>
            {label}
          </span>
          {actions}
        </div>
      ) : (
        <span id={labelId} className={LABEL_CLASS}>
          {label}
        </span>
      )}
      {children(labelId)}
    </div>
  );
}

function acceptsSubstitution(dragged: DraggedItem): boolean {
  return dragged.kind === LIBRARY_EXERCISE && dragged.item.exercise.type === 'resistance';
}

function Substitutions({ row, exercise, library, substitutionDrop, onAddSubstitution, onRemoveSubstitution, onSuggestSubstitutions }: ExerciseRowDetailsProps) {
  const nameOf = (id: string) => exerciseNameOf(library.find(item => item.id === id));
  const room = row.substitutions.length < MAX_SUBSTITUTIONS;
  const filling = useIsLibraryTarget({ kind: 'substitution', sessionId: substitutionDrop.sessionId, rowId: row.id });
  return (
    <DropZone
      rules={substitutionDrop}
      accepts={acceptsSubstitution}
      className={cn('rounded-field', { [LIBRARY_TARGET_CLASS]: filling })}
    >
      <fieldset className="grid gap-1.5">
        <legend className={cn(LABEL_CLASS, 'mb-1.5')}>Substitutions</legend>
        <div className="flex flex-wrap items-center gap-6">
          {row.substitutions.length > 0 && (
            <ul className="flex min-w-0 flex-wrap gap-x-2 gap-y-6">
              {row.substitutions.map(id => (
                <RemovableChip key={id} label={nameOf(id)} removeLabel={`Remove ${nameOf(id)}`} onRemove={() => onRemoveSubstitution(id)} />
              ))}
            </ul>
          )}
          {room && (
            <div className="flex items-center gap-4">
              <IconActionButton
                icon={Plus}
                label={`Add substitution for ${exerciseNameOf(exercise)}`}
                hint="Add substitution"
                onClick={onAddSubstitution}
              />
              {exercise && (
                <Button variant="ghost" size="xs" onClick={onSuggestSubstitutions}>
                  <Sparkles aria-hidden="true" />
                  Suggest
                </Button>
              )}
            </div>
          )}
        </div>
      </fieldset>
    </DropZone>
  );
}

function resetCues(row: Row, exercise: Exercise): Row {
  return { ...row, cues: exercise.cues, touched: row.touched.filter(field => field !== 'cues') };
}

export function ExerciseRowDetails(props: ExerciseRowDetailsProps) {
  const { row, exercise, onChange } = props;
  return (
    <>
      <Detail label="Tempo">
        {labelId => (
          <Input
            aria-labelledby={labelId}
            placeholder="Lower for 3 seconds, pause 1 second at the bottom"
            value={row.tempo ?? ''}
            onChange={event => onChange(withField(row, 'tempo', event.target.value || undefined))}
          />
        )}
      </Detail>
      <Detail
        label="Cues"
        actions={
          <>
            <IconActionButton
              icon={RotateCcw}
              label="Reset cues from library"
              hint="Reset from library"
              disabled={!exercise}
              onClick={() => exercise && onChange(resetCues(row, exercise))}
            />
            {exercise?.videoUrl && (
              <span className="ml-auto">
                <WatchVideoButton name={exercise.name} videoUrl={exercise.videoUrl} appearance="icon" />
              </span>
            )}
          </>
        }
      >
        {labelId => <Textarea aria-labelledby={labelId} value={row.cues} onChange={event => onChange(withField(row, 'cues', event.target.value))} />}
      </Detail>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Detail label="Last set">
          {labelId => (
            <Select value={row.lastSetTechnique} onValueChange={value => onChange(withField(row, 'lastSetTechnique', value as LastSetTechnique))}>
              <SelectTrigger aria-labelledby={labelId}>
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
          )}
        </Detail>
        <Detail label="Progression">
          {labelId => (
            <Select
              value={row.progression.kind}
              onValueChange={value => onChange(withField(row, 'progression', value === 'custom' ? { kind: 'custom', text: '' } : { kind: 'double' }))}
            >
              <SelectTrigger aria-labelledby={labelId}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="double">Double progression</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          )}
        </Detail>
        {row.progression.kind === 'custom' && (
          <Textarea
            aria-label="Custom progression"
            className="sm:col-span-2"
            value={row.progression.text}
            onChange={event => onChange(withField(row, 'progression', { kind: 'custom', text: event.target.value }))}
          />
        )}
      </div>
      <Substitutions {...props} />
    </>
  );
}
