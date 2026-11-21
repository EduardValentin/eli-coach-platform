import {
  CheckboxChip,
  ChoiceGroup,
  ChoiceOption,
  FieldError,
  FieldLayout,
  Legend,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/shared/design-system/primitives";
import { useId, useRef } from "react";
import {
  useController,
  type Control,
  type UseFormReturn,
} from "react-hook-form";

import type { ProgramSetupView } from "~/bounded-contexts/programs/training-programs/public/program-setup";

export type ReadySetup = Extract<ProgramSetupView, { state: "ready" }>;

export type SetupValues = ReadySetup["startingValues"];

type SetupChoices = ReadySetup["choices"];

type EquipmentOption = SetupChoices["equipment"][number];

type SetupOption = { value: string | number; label: string };

type SelectName = "goal" | "level" | "dailySteps" | "language";

type ChoiceName = "trainingDays" | "splitShape" | "sessionMinutes";

type SetupSelectProps = {
  control: Control<SetupValues>;
  name: SelectName;
  label: string;
  options: readonly SetupOption[];
  required?: boolean;
};

type SetupChoiceProps<Option extends SetupOption> = {
  control: Control<SetupValues>;
  name: ChoiceName;
  label: string;
  options: readonly Option[];
  onChoose?: (option: Option) => void;
};

type EquipmentFieldProps = {
  control: Control<SetupValues>;
  options: readonly EquipmentOption[];
};

type ProgramSetupFieldsProps = {
  form: UseFormReturn<SetupValues>;
  choices: SetupChoices;
};

const SELECT_PLACEHOLDER = "Choose one";

function optionNamed<Option extends SetupOption>(
  options: readonly Option[],
  value: string,
): Option | undefined {
  return options.find((option) => String(option.value) === value);
}

function SetupSelect({
  control,
  name,
  label,
  options,
  required,
}: SetupSelectProps) {
  const { field, fieldState } = useController({ control, name });

  return (
    <FieldLayout
      data-parity={`field-${name}`}
      error={fieldState.error?.message}
      errorParity={`field-${name}-error`}
      label={label}
      required={required}
    >
      {(controlAttributes) => (
        <Select
          onValueChange={(value) =>
            field.onChange(optionNamed(options, value)?.value)
          }
          value={String(field.value)}
        >
          <SelectTrigger
            {...controlAttributes}
            className="w-full"
            data-parity={`field-${name}-trigger`}
            ref={field.ref}
          >
            <SelectValue placeholder={SELECT_PLACEHOLDER} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={String(option.value)}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </FieldLayout>
  );
}

function SetupChoice<Option extends SetupOption>({
  control,
  name,
  label,
  options,
  onChoose,
}: SetupChoiceProps<Option>) {
  const legendId = useId();
  const { field } = useController({ control, name });

  function choose(value: string) {
    const option = optionNamed(options, value);

    if (!option) return;
    field.onChange(option.value);
    onChoose?.(option);
  }

  return (
    <div className="grid gap-2" data-parity={`field-${name}`}>
      <fieldset>
        <Legend id={legendId}>{label}</Legend>
        <ChoiceGroup
          aria-labelledby={legendId}
          className="mt-2"
          onValueChange={choose}
          ref={field.ref}
          value={String(field.value)}
        >
          {options.map((option) => (
            <ChoiceOption key={option.value} value={String(option.value)}>
              {option.label}
            </ChoiceOption>
          ))}
        </ChoiceGroup>
      </fieldset>
    </div>
  );
}

function withEquipment(
  chosen: readonly string[],
  picked: EquipmentOption,
  options: readonly EquipmentOption[],
): string[] {
  if (picked.exclusive) return [picked.value];

  const exclusive = options
    .filter((option) => option.exclusive)
    .map((option) => option.value);

  return [
    ...chosen.filter((value) => !exclusive.includes(value)),
    picked.value,
  ];
}

function EquipmentField({ control, options }: EquipmentFieldProps) {
  const messageId = `${useId()}-message`;
  const { field, fieldState } = useController({ control, name: "equipment" });
  const chosen = field.value;
  const problem = fieldState.error?.message;

  return (
    <div className="grid gap-2" data-parity="field-equipment">
      <fieldset aria-describedby={problem ? messageId : undefined}>
        <Legend required>Equipment</Legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {options.map((option, index) => (
            <CheckboxChip
              aria-label={option.value}
              isChecked={chosen.includes(option.value)}
              key={option.value}
              onChange={(event) =>
                field.onChange(
                  event.target.checked
                    ? withEquipment(chosen, option, options)
                    : chosen.filter((value) => value !== option.value),
                )
              }
              ref={index === 0 ? field.ref : undefined}
            >
              {option.value}
            </CheckboxChip>
          ))}
        </div>
      </fieldset>
      <FieldError
        data-parity="field-equipment-error"
        id={messageId}
        message={problem}
      />
    </div>
  );
}

function useSplitFollowingDays(form: UseFormReturn<SetupValues>) {
  const coachPickedSplit = useRef(false);

  return {
    followTrainingDays(splitShape: SetupValues["splitShape"]) {
      if (coachPickedSplit.current) return;
      form.setValue("splitShape", splitShape, { shouldDirty: true });
    },
    keepChosenSplit() {
      coachPickedSplit.current = true;
    },
  };
}

export function ProgramSetupFields({ form, choices }: ProgramSetupFieldsProps) {
  const { control } = form;
  const split = useSplitFollowingDays(form);

  return (
    <>
      <SetupSelect
        control={control}
        label="Goal"
        name="goal"
        options={choices.goals}
        required
      />
      <SetupSelect
        control={control}
        label="Level"
        name="level"
        options={choices.levels}
      />
      <SetupChoice
        control={control}
        label="Training days"
        name="trainingDays"
        onChoose={(option) => split.followTrainingDays(option.splitShape)}
        options={choices.trainingDays}
      />
      <SetupChoice
        control={control}
        label="Split"
        name="splitShape"
        onChoose={split.keepChosenSplit}
        options={choices.splitShapes}
      />
      <SetupChoice
        control={control}
        label="Session length"
        name="sessionMinutes"
        options={choices.sessionMinutes}
      />
      <SetupSelect
        control={control}
        label="Daily steps"
        name="dailySteps"
        options={choices.dailySteps}
      />
      <EquipmentField control={control} options={choices.equipment} />
      <SetupSelect
        control={control}
        label="Program language"
        name="language"
        options={choices.languages}
      />
    </>
  );
}
