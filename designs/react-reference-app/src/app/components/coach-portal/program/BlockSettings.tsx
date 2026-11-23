import { useId, useRef, type ReactNode } from 'react';
import { Info } from 'lucide-react';
import type { Block, SplitShape, TrainingDays } from '../../../domain/program';
import { DAILY_STEP_TARGETS, TARGET_MINUTES } from '../../../domain/programDefaults';
import { SPLIT_TEMPLATES } from '../../../domain/splitTemplates';
import { IconHint } from '../../IconHint';
import { LABEL_CLASS } from '../../typography';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Switch } from '../../ui/switch';
import { cn } from '../../ui/utils';
import { OptionSelect, type Option } from './OptionSelect';
import { WeeksField, WeeksFieldNotes, type WeeksFieldState } from './weeksField';

type BlockSettingsProps = {
  block: Block;
  weeks: WeeksFieldState;
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

function Setting({ label, name, children }: { label: string; name: string; children: (labelId: string) => ReactNode }) {
  const labelId = useId();
  return (
    <div className="grid content-start gap-1.5" data-parity={`setting-${name}`}>
      <span id={labelId} className={LABEL_CLASS}>
        {label}
      </span>
      {children(labelId)}
    </div>
  );
}

function LengthSettings({ block, weeks, onChange }: Pick<BlockSettingsProps, 'block' | 'weeks' | 'onChange'>) {
  return (
    <>
      <Setting label="Weeks" name="weeks">
        {labelId => (
          <>
            <WeeksField field={weeks} name={{ labelledBy: labelId }} />
            <WeeksFieldNotes field={weeks} />
          </>
        )}
      </Setting>
      {block.type !== 'deload' && (
        <Setting label="Calibration" name="calibration">
          {labelId => (
            <span role="group" aria-labelledby={labelId} className="flex min-h-(--size-control-md) items-center gap-1">
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
    </>
  );
}

function ScheduleSettings({ block, onChange, onChangeShape, onChangeTrainingDays }: Omit<BlockSettingsProps, 'weeks'>) {
  const splitTrigger = useRef<HTMLButtonElement>(null);
  const daysTrigger = useRef<HTMLButtonElement>(null);
  return (
    <>
      <Setting label="Split" name="split">
        {labelId => (
          <Select value={block.split.shape} onValueChange={value => onChangeShape(value as SplitShape, splitTrigger.current)}>
            <SelectTrigger ref={splitTrigger} className="w-36" aria-labelledby={labelId}>
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
      <Setting label="Training days" name="training-days">
        {labelId => (
          <OptionSelect
            labelledBy={labelId}
            triggerRef={daysTrigger}
            options={TRAINING_DAY_OPTIONS}
            value={block.trainingDays}
            onChange={days => onChangeTrainingDays(days, daysTrigger.current)}
          />
        )}
      </Setting>
      <Setting label="Split name" name="split-name">
        {labelId => (
          <Input
            className="w-40"
            aria-labelledby={labelId}
            placeholder={SPLIT_TEMPLATES[block.split.shape].label}
            value={block.split.name}
            onChange={event => onChange({ ...block, split: { ...block.split, name: event.target.value } })}
          />
        )}
      </Setting>
      <Setting label="Target" name="target">
        {labelId => (
          <Select value={String(block.targetMinutes)} onValueChange={value => onChange({ ...block, targetMinutes: Number(value) })}>
            <SelectTrigger className="w-28" aria-labelledby={labelId}>
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
      <Setting label="Daily steps" name="daily-steps">
        {labelId => (
          <OptionSelect
            labelledBy={labelId}
            options={stepOptions(block.dailySteps)}
            value={block.dailySteps}
            onChange={dailySteps => onChange({ ...block, dailySteps })}
          />
        )}
      </Setting>
    </>
  );
}

/** Fields wrap freely on a phone, sit in four aligned columns once the card has room, and share one row when all seven fit. */
const SETTINGS_LAYOUT_CLASS = cn(
  'flex flex-wrap items-start gap-4',
  '@min-[40rem]:grid @min-[40rem]:grid-cols-[repeat(4,max-content)] @min-[40rem]:justify-between @min-[40rem]:gap-x-6',
  // 61.25rem: the seven fields' widest content, 55.25rem as measured in the browser, plus six 1rem gaps.
  '@min-[61.25rem]:grid-flow-col @min-[61.25rem]:grid-cols-none @min-[61.25rem]:auto-cols-max @min-[61.25rem]:gap-x-4',
);

export function BlockSettings(props: BlockSettingsProps) {
  return (
    <div className="@container px-4 py-3" data-parity="block-settings">
      <div className={SETTINGS_LAYOUT_CLASS} data-parity="settings-fields">
        <LengthSettings block={props.block} weeks={props.weeks} onChange={props.onChange} />
        <ScheduleSettings block={props.block} onChange={props.onChange} onChangeShape={props.onChangeShape} onChangeTrainingDays={props.onChangeTrainingDays} />
      </div>
    </div>
  );
}
