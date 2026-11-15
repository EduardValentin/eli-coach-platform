import { useId, useRef, type ReactNode } from 'react';
import { Info } from 'lucide-react';
import type { Block, SplitShape, TrainingDays } from '../../../domain/program';
import { DAILY_STEP_TARGETS, TARGET_MINUTES } from '../../../domain/programDefaults';
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
  onChangeShape: (shape: SplitShape, trigger: HTMLElement | null) => void;
  onChangeTrainingDays: (days: TrainingDays, trigger: HTMLElement | null) => void;
};

const SPLIT_SHAPES = Object.keys(SPLIT_TEMPLATES) as SplitShape[];
const TRAINING_DAY_OPTIONS: Option<TrainingDays>[] = ([2, 3, 4, 5] as const).map(days => ({ value: days, label: `${days} days` }));
const CALIBRATION_HINT = 'Week 1 keeps the planned values; she stops 2–3 reps short while finding her weights.';

function stepOptions(current: number): Option<number>[] {
  const values = new Set<number>([current, ...DAILY_STEP_TARGETS]);
  return [...values].sort((a, b) => a - b).map(value => ({ value, label: value.toLocaleString('en-US') }));
}

function Setting({ label, children }: { label: string; children: (labelId: string) => ReactNode }) {
  const labelId = useId();
  return (
    <div className="grid content-start gap-1.5">
      <span id={labelId} className={LABEL_CLASS}>
        {label}
      </span>
      {children(labelId)}
    </div>
  );
}

function LengthSettings({ block, weeks, onChange }: Pick<BlockSettingsProps, 'block' | 'weeks' | 'onChange'>) {
  return (
    <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
      <Setting label="Weeks">
        {labelId => (
          <>
            <label className="relative hit-area flex items-center gap-1.5 text-sm text-text-secondary">
              <Input size="sm" className="w-16 tabular-nums" aria-labelledby={labelId} {...weeks.inputProps} />
              wk
            </label>
            {weeks.problem && <InlineProblem id={weeks.problemId}>{weeks.problem}</InlineProblem>}
          </>
        )}
      </Setting>
      {block.type !== 'deload' && (
        <Setting label="Calibration">
          {labelId => (
            <span role="group" aria-labelledby={labelId} className="flex min-h-(--size-control-sm) items-center gap-1">
              <label className="flex items-center gap-2 text-sm text-text-primary">
                <Switch checked={block.calibrationWeek} onCheckedChange={checked => onChange({ ...block, calibrationWeek: checked })} />
                Calibration week
              </label>
              <IconHint label="What a calibration week is" icon={<Info aria-hidden="true" size={14} />} size="compact" tone="muted">
                {CALIBRATION_HINT}
              </IconHint>
            </span>
          )}
        </Setting>
      )}
    </div>
  );
}

function ScheduleSettings({ block, onChange, onChangeShape, onChangeTrainingDays }: Omit<BlockSettingsProps, 'weeks'>) {
  const splitTrigger = useRef<HTMLButtonElement>(null);
  const daysTrigger = useRef<HTMLButtonElement>(null);
  return (
    <div className="flex flex-wrap items-start gap-x-4 gap-y-4">
      <Setting label="Split">
        {labelId => (
          <Select value={block.split.shape} onValueChange={value => onChangeShape(value as SplitShape, splitTrigger.current)}>
            <SelectTrigger ref={splitTrigger} size="sm" className="w-36" aria-labelledby={labelId}>
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
        )}
      </Setting>
      <Setting label="Training days">
        {labelId => (
          <OptionSelect
            size="sm"
            labelledBy={labelId}
            triggerRef={daysTrigger}
            options={TRAINING_DAY_OPTIONS}
            value={block.trainingDays}
            onChange={days => onChangeTrainingDays(days, daysTrigger.current)}
          />
        )}
      </Setting>
      <Setting label="Split name">
        {labelId => (
          <Input
            size="sm"
            className="w-40"
            aria-labelledby={labelId}
            placeholder={SPLIT_TEMPLATES[block.split.shape].label}
            value={block.split.name}
            onChange={event => onChange({ ...block, split: { ...block.split, name: event.target.value } })}
          />
        )}
      </Setting>
      <Setting label="Target">
        {labelId => (
          <Select value={String(block.targetMinutes)} onValueChange={value => onChange({ ...block, targetMinutes: Number(value) })}>
            <SelectTrigger size="sm" className="w-28" aria-labelledby={labelId}>
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
        )}
      </Setting>
      <Setting label="Daily steps">
        {labelId => (
          <OptionSelect
            size="sm"
            labelledBy={labelId}
            options={stepOptions(block.dailySteps)}
            value={block.dailySteps}
            onChange={dailySteps => onChange({ ...block, dailySteps })}
          />
        )}
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
