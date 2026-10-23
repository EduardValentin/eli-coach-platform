import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import type { Block, SplitShape, TrainingDays } from '../../../domain/program';
import { STEPS_STEP, TARGET_MINUTES } from '../../../domain/programDefaults';
import { SPLIT_TEMPLATES } from '../../../domain/splitTemplates';
import { IconHint } from '../../IconHint';
import { InlineProblem } from '../../InlineProblem';
import { LABEL_CLASS } from '../../typography';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Switch } from '../../ui/switch';
import { OptionSelect, type Option } from './OptionSelect';
import type { useWeeksField } from './weeksField';

type BlockSettingsProps = {
  block: Block;
  weeks: ReturnType<typeof useWeeksField>;
  onChange: (block: Block) => void;
  onChangeShape: (shape: SplitShape) => void;
  onChangeTrainingDays: (days: TrainingDays) => void;
};

const SPLIT_SHAPES = Object.keys(SPLIT_TEMPLATES) as SplitShape[];
const TRAINING_DAY_OPTIONS: Option<TrainingDays>[] = ([2, 3, 4, 5] as const).map(days => ({ value: days, label: `${days} days` }));
const MIN_STEPS = 4000;
const MAX_STEPS = 12000;
const CALIBRATION_HINT = 'Week 1 keeps the planned values; she stops 2–3 reps short while finding her weights.';

function stepOptions(current: number): Option<number>[] {
  const values = new Set<number>([current]);
  for (let steps = MIN_STEPS; steps <= MAX_STEPS; steps += STEPS_STEP) values.add(steps);
  return [...values].sort((a, b) => a - b).map(value => ({ value, label: value.toLocaleString('en-US') }));
}

function Setting({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid content-start gap-1.5">
      <span aria-hidden="true" className={LABEL_CLASS}>
        {label}
      </span>
      {children}
    </div>
  );
}

function LengthSettings({ block, weeks, onChange }: Pick<BlockSettingsProps, 'block' | 'weeks' | 'onChange'>) {
  return (
    <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
      <Setting label="Weeks">
        <span className="flex items-center gap-1.5 text-sm text-text-secondary">
          <Input size="sm" className="w-16 tabular-nums" aria-label="Weeks" {...weeks.inputProps} />
          wk
        </span>
        {weeks.problem && <InlineProblem id={weeks.problemId}>{weeks.problem}</InlineProblem>}
      </Setting>
      {block.type !== 'deload' && (
        <Setting label="Calibration">
          <span className="flex min-h-(--size-control-sm) items-center gap-1">
            <label className="flex items-center gap-2 text-sm text-text-primary">
              <Switch checked={block.calibrationWeek} onCheckedChange={checked => onChange({ ...block, calibrationWeek: checked })} />
              Calibration week
            </label>
            <IconHint label="What a calibration week is" icon={<Info aria-hidden="true" size={14} />} size="compact" tone="muted">
              {CALIBRATION_HINT}
            </IconHint>
          </span>
        </Setting>
      )}
    </div>
  );
}

function ScheduleSettings({ block, onChange, onChangeShape, onChangeTrainingDays }: Omit<BlockSettingsProps, 'weeks'>) {
  return (
    <div className="flex flex-wrap items-start gap-x-4 gap-y-4">
      <Setting label="Split">
        <Select value={block.split.shape} onValueChange={value => onChangeShape(value as SplitShape)}>
          <SelectTrigger size="sm" className="w-36" aria-label="Split shape">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SPLIT_SHAPES.map(shape => (
              <SelectItem key={shape} value={shape}>
                {SPLIT_TEMPLATES[shape].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Setting>
      <Setting label="Training days">
        <OptionSelect size="sm" label="Training days" options={TRAINING_DAY_OPTIONS} value={block.trainingDays} onChange={onChangeTrainingDays} />
      </Setting>
      <Setting label="Split name">
        <Input
          size="sm"
          className="w-40"
          aria-label="Split name"
          placeholder={SPLIT_TEMPLATES[block.split.shape].label}
          value={block.split.name}
          onChange={event => onChange({ ...block, split: { ...block.split, name: event.target.value } })}
        />
      </Setting>
      <Setting label="Target">
        <Select value={String(block.targetMinutes)} onValueChange={value => onChange({ ...block, targetMinutes: Number(value) })}>
          <SelectTrigger size="sm" className="w-28" aria-label="Target minutes">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TARGET_MINUTES.map(minutes => (
              <SelectItem key={minutes} value={String(minutes)}>
                {`${minutes} min`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Setting>
      <Setting label="Daily steps">
        <OptionSelect
          size="sm"
          label="Daily steps"
          options={stepOptions(block.dailySteps)}
          value={block.dailySteps}
          onChange={dailySteps => onChange({ ...block, dailySteps })}
        />
      </Setting>
    </div>
  );
}

export function BlockSettings(props: BlockSettingsProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4 px-4 py-3">
      <LengthSettings block={props.block} weeks={props.weeks} onChange={props.onChange} />
      <ScheduleSettings block={props.block} onChange={props.onChange} onChangeShape={props.onChangeShape} onChangeTrainingDays={props.onChangeTrainingDays} />
    </div>
  );
}
