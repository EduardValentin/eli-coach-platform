import { Info } from "lucide-react";
import { useId, useRef, type ReactNode } from "react";

import { cn, LABEL_CLASS } from "~/shared/design-system/lib";
import {
  IconHint,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "~/shared/design-system/primitives";

import {
  DAILY_STEP_TARGETS,
  SESSION_MINUTE_OPTIONS,
  SPLIT_SHAPES,
  SplitTemplate,
  TRAINING_DAY_OPTIONS,
  type Block,
  type SplitShape,
  type TrainingDays,
} from "~/bounded-contexts/programs/training-programs/public/program-editing";

import { OptionSelect, type Option } from "./option-select";
import {
  WeeksField,
  WeeksFieldNotes,
  type WeeksFieldState,
} from "./weeks-field";

type BlockSettingsProps = {
  block: Block;
  weeks: WeeksFieldState;
  onChange: (block: Block) => void;
  onChangeShape: (shape: SplitShape, trigger: HTMLElement | null) => void;
  onChangeTrainingDays: (
    days: TrainingDays,
    trigger: HTMLElement | null,
  ) => void;
};

const TRAINING_DAY_CHOICES: Option<TrainingDays>[] = TRAINING_DAY_OPTIONS.map(
  (days) => ({ value: days, label: `${days} days` }),
);

const CALIBRATION_HINT =
  "Week 1 keeps the planned values; she stops 2–3 reps short while finding her weights.";

function stepOptions(current: number): Option<number>[] {
  const values = new Set<number>([current, ...DAILY_STEP_TARGETS]);

  return [...values]
    .sort((a, b) => a - b)
    .map((value) => ({ value, label: value.toLocaleString("en-US") }));
}

function shapeOf(value: string): SplitShape | undefined {
  return SPLIT_SHAPES.find((shape) => shape === value);
}

type SettingProps = {
  children: (labelId: string) => ReactNode;
  label: string;
  name: string;
};

function Setting({ children, label, name }: SettingProps) {
  const labelId = useId();

  return (
    <div className="grid content-start gap-1.5" data-parity={`setting-${name}`}>
      <span className={LABEL_CLASS} id={labelId}>
        {label}
      </span>
      {children(labelId)}
    </div>
  );
}

function LengthSettings({
  block,
  weeks,
  onChange,
}: Pick<BlockSettingsProps, "block" | "weeks" | "onChange">) {
  const switchId = useId();

  return (
    <>
      <Setting label="Weeks" name="weeks">
        {(labelId) => (
          <>
            <WeeksField field={weeks} name={{ labelledBy: labelId }} />
            <WeeksFieldNotes field={weeks} />
          </>
        )}
      </Setting>
      {block.type !== "deload" && (
        <Setting label="Calibration" name="calibration">
          {(labelId) => (
            <span
              aria-labelledby={labelId}
              className="flex min-h-(--size-control-md) items-center gap-1"
              role="group"
            >
              <label
                className="flex items-center gap-2 text-sm text-text-primary"
                htmlFor={switchId}
              >
                <Switch
                  checked={block.calibrationWeek}
                  id={switchId}
                  onCheckedChange={(checked) =>
                    onChange({ ...block, calibrationWeek: checked })
                  }
                />
                Calibration week
              </label>
              <IconHint
                icon={<Info aria-hidden="true" size={14} />}
                label="What a calibration week is"
                size="compact"
                tone="muted"
              >
                {CALIBRATION_HINT}
              </IconHint>
            </span>
          )}
        </Setting>
      )}
    </>
  );
}

function ScheduleSettings({
  block,
  onChange,
  onChangeShape,
  onChangeTrainingDays,
}: Omit<BlockSettingsProps, "weeks">) {
  const splitTrigger = useRef<HTMLButtonElement>(null);
  const daysTrigger = useRef<HTMLButtonElement>(null);

  return (
    <>
      <Setting label="Split" name="split">
        {(labelId) => (
          <Select
            onValueChange={(value) => {
              const shape = shapeOf(value);
              if (shape) onChangeShape(shape, splitTrigger.current);
            }}
            value={block.split.shape}
          >
            <SelectTrigger
              aria-labelledby={labelId}
              className="w-36"
              ref={splitTrigger}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SPLIT_SHAPES.map((shape) => (
                <SelectItem key={shape} value={shape}>
                  {SplitTemplate.of(shape).label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </Setting>
      <Setting label="Training days" name="training-days">
        {(labelId) => (
          <OptionSelect
            labelledBy={labelId}
            onChange={(days) => onChangeTrainingDays(days, daysTrigger.current)}
            options={TRAINING_DAY_CHOICES}
            triggerRef={daysTrigger}
            value={block.trainingDays}
          />
        )}
      </Setting>
      <Setting label="Split name" name="split-name">
        {(labelId) => (
          <Input
            aria-labelledby={labelId}
            className="w-40"
            onChange={(event) =>
              onChange({
                ...block,
                split: { ...block.split, name: event.target.value },
              })
            }
            placeholder={SplitTemplate.of(block.split.shape).label}
            value={block.split.name}
          />
        )}
      </Setting>
      <Setting label="Target" name="target">
        {(labelId) => (
          <Select
            onValueChange={(value) =>
              onChange({ ...block, targetMinutes: Number(value) })
            }
            value={String(block.targetMinutes)}
          >
            <SelectTrigger aria-labelledby={labelId} className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SESSION_MINUTE_OPTIONS.map((minutes) => (
                <SelectItem key={minutes} value={String(minutes)}>
                  {`${minutes} min`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </Setting>
      <Setting label="Daily steps" name="daily-steps">
        {(labelId) => (
          <OptionSelect
            labelledBy={labelId}
            onChange={(dailySteps) => onChange({ ...block, dailySteps })}
            options={stepOptions(block.dailySteps)}
            value={block.dailySteps}
          />
        )}
      </Setting>
    </>
  );
}

/** Fields wrap freely on a phone, sit in four aligned columns once the card has room, and share one row when all seven fit. */
const SETTINGS_LAYOUT_CLASS = cn(
  "flex flex-wrap items-start gap-4",
  "@min-[40rem]:grid @min-[40rem]:grid-cols-[repeat(4,max-content)] @min-[40rem]:justify-between @min-[40rem]:gap-x-6",
  // 61.25rem: the seven fields' widest content, 55.25rem as measured in the browser, plus six 1rem gaps.
  "@min-[61.25rem]:grid-flow-col @min-[61.25rem]:grid-cols-none @min-[61.25rem]:auto-cols-max @min-[61.25rem]:gap-x-4",
);

export function BlockSettings(props: BlockSettingsProps) {
  return (
    <div className="@container px-4 py-3" data-parity="block-settings">
      <div className={SETTINGS_LAYOUT_CLASS} data-parity="settings-fields">
        <LengthSettings
          block={props.block}
          onChange={props.onChange}
          weeks={props.weeks}
        />
        <ScheduleSettings
          block={props.block}
          onChange={props.onChange}
          onChangeShape={props.onChangeShape}
          onChangeTrainingDays={props.onChangeTrainingDays}
        />
      </div>
    </div>
  );
}
