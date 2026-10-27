import {
  CANONICAL_MEASURE_UNITS,
  formatFeetAndInches,
  measureStep,
  measureUnitLabel,
  type MeasureUnits,
} from "~/bounded-contexts/clients/client-profile/domain/client-settings";
import { DateField } from "~/shared/design-system/calendar";
import { cn, describedByOf } from "~/shared/design-system/lib";
import { SettingsBody } from "~/shared/design-system/portal";
import {
  CheckboxChip,
  CheckboxField,
  ChoiceGroup,
  ChoiceOption,
  FieldError,
  FieldHint,
  FieldLayout,
  Input,
  LabelSuffix,
  Legend,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  type FieldControlAttributes,
} from "~/shared/design-system/primitives";
import { useId, type ReactElement, type ReactNode } from "react";
import {
  useController,
  type Control,
  type ControllerRenderProps,
  type FieldPath,
  type FieldPathValue,
  type FieldValues,
  type Validate,
} from "react-hook-form";

import {
  MeasureField,
  type MeasureFieldDefinition,
} from "~/bounded-contexts/clients/client-profile/ui/shared/measure-field/measure-field";

import {
  entryBounds,
  measureKindOf,
  TICKED,
  UNTICKED,
  type ProfileField,
} from "./profile-fields";

type ProfileFieldControlProps<TValues extends FieldValues> = {
  control: Control<TValues>;
  field: ProfileField;
  units: MeasureUnits;
  labelAdornment?: ReactNode;
  validate?: Validate<FieldPathValue<TValues, FieldPath<TValues>>, TValues>;
};

type ProfileFieldRowsProps<TValues extends FieldValues> = {
  control: Control<TValues>;
  fields: readonly ProfileField[];
  units?: MeasureUnits;
  adornments?: Partial<Record<string, ReactNode>>;
};

type FieldController = Pick<
  ControllerRenderProps,
  "onBlur" | "onChange" | "ref" | "value"
>;

type FieldIds = {
  hint: string;
  legend: string;
  message: string;
};

type ProfileFieldRowProps = {
  controller: FieldController;
  error: string | undefined;
  field: ProfileField;
  ids: FieldIds;
  labelAdornment: ReactNode;
  units: MeasureUnits;
};

type ProfileFieldInputProps = {
  controller: FieldController;
  controlAttributes: FieldControlAttributes;
  field: ProfileField;
  units: MeasureUnits;
};

type UnitSuffixEntry = { parity: string; text: string };

const WHOLE_STEP = "1";

const SELECT_PLACEHOLDER = "Choose one";

function textOf(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function listOf(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function isRequired(field: ProfileField): boolean {
  return field.requirement === "required";
}

function entryStep(field: ProfileField, units: MeasureUnits): string {
  if (field.step) return field.step;

  const measureKind = measureKindOf(field);

  return measureKind ? measureStep(measureKind, units) : WHOLE_STEP;
}

function feetAndInchesHint(
  field: ProfileField,
  controller: FieldController,
  units: MeasureUnits,
): string | null {
  if (field.kind !== "height" || units.length !== "in") return null;

  const entered = Number(textOf(controller.value));

  return Number.isFinite(entered) && entered > 0
    ? formatFeetAndInches(entered)
    : null;
}

function unitSuffixesOf(
  field: ProfileField,
  units: MeasureUnits,
): UnitSuffixEntry[] {
  const parity = `field-${field.id}-suffix-unit`;
  const measureKind = measureKindOf(field);
  const suffixes: (UnitSuffixEntry | null)[] = [
    measureKind
      ? { parity, text: `(${measureUnitLabel(measureKind, units)})` }
      : null,
    field.unitSuffix ? { parity, text: `(${field.unitSuffix})` } : null,
  ];

  return suffixes.filter(
    (suffix): suffix is UnitSuffixEntry => suffix !== null,
  );
}

function withChip(
  field: ProfileField,
  chosen: readonly string[],
  option: string,
): string[] {
  if (field.exclusiveOptions?.includes(option)) return [option];

  return [
    ...chosen.filter((picked) => !field.exclusiveOptions?.includes(picked)),
    option,
  ];
}

function withoutChip(chosen: readonly string[], option: string): string[] {
  return chosen.filter((picked) => picked !== option);
}

function measureFieldOf(field: ProfileField): MeasureFieldDefinition | null {
  if (field.kind !== "weight" && field.kind !== "circumference") return null;
  if (!field.range) return null;

  return {
    id: field.id,
    label: field.label,
    kind: field.kind,
    requirement: field.requirement,
    range: field.range,
    hint: field.hint,
  };
}

function LabelLines({ field }: { field: ProfileField }) {
  return field.label.split("\n").map((line, index) => (
    <span className={cn({ block: index > 0 })} key={line}>
      {line}
    </span>
  ));
}

function LabelTrailing({
  adornment,
  field,
  units,
}: {
  adornment: ReactNode;
  field: ProfileField;
  units: MeasureUnits;
}) {
  return (
    <>
      {unitSuffixesOf(field, units).map((suffix) => (
        <LabelSuffix data-parity={suffix.parity} key={suffix.text}>
          {suffix.text}
        </LabelSuffix>
      ))}
      {adornment}
    </>
  );
}

function NumberInput({
  controller,
  controlAttributes,
  field,
  units,
}: ProfileFieldInputProps) {
  const bounds = entryBounds(field, units);

  return (
    <Input
      {...controlAttributes}
      inputMode={measureKindOf(field) ? "decimal" : "numeric"}
      max={bounds?.max}
      min={bounds?.min}
      onBlur={controller.onBlur}
      onChange={controller.onChange}
      placeholder={field.placeholder}
      ref={controller.ref}
      step={entryStep(field, units)}
      type="number"
      value={textOf(controller.value)}
    />
  );
}

function SelectInput({
  controller,
  controlAttributes,
  field,
}: ProfileFieldInputProps) {
  return (
    <Select
      onValueChange={controller.onChange}
      value={textOf(controller.value)}
    >
      <SelectTrigger
        {...controlAttributes}
        className="w-full"
        data-parity={`field-${field.id}-trigger`}
      >
        <SelectValue placeholder={field.placeholder ?? SELECT_PLACEHOLDER} />
      </SelectTrigger>
      <SelectContent>
        {(field.options ?? []).map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ProfileFieldInput(props: ProfileFieldInputProps): ReactElement {
  const { controller, controlAttributes, field } = props;

  if (field.kind === "select") return <SelectInput {...props} />;
  if (measureKindOf(field) || field.kind === "number") {
    return <NumberInput {...props} />;
  }

  if (field.kind === "textarea") {
    return (
      <Textarea
        {...controlAttributes}
        className="min-h-28"
        onBlur={controller.onBlur}
        onChange={controller.onChange}
        placeholder={field.placeholder}
        ref={controller.ref}
        value={textOf(controller.value)}
      />
    );
  }

  if (field.kind === "date") {
    return (
      <DateField
        {...controlAttributes}
        calendarLabel={field.label}
        data-parity={`field-${field.id}-trigger`}
        disabledDays={{ after: new Date() }}
        onBlur={controller.onBlur}
        onChange={controller.onChange}
        ref={controller.ref}
        value={textOf(controller.value)}
      />
    );
  }

  return (
    <Input
      {...controlAttributes}
      onBlur={controller.onBlur}
      onChange={controller.onChange}
      placeholder={field.placeholder}
      ref={controller.ref}
      type="text"
      value={textOf(controller.value)}
    />
  );
}

function CheckboxRow({ controller, error, field }: ProfileFieldRowProps) {
  const isAgreement = isRequired(field);

  return (
    <CheckboxField
      checkboxParity={`field-${field.id}-checkbox`}
      checkboxRef={controller.ref}
      checked={textOf(controller.value) === TICKED}
      className={cn({ "-mt-2": !isAgreement })}
      data-parity={`field-${field.id}`}
      error={error}
      errorParity={`field-${field.id}-error`}
      frame={isAgreement ? "inset" : "none"}
      label={field.label}
      layout={isAgreement ? "statement" : "inline"}
      onCheckedChange={(checked) =>
        controller.onChange(checked ? TICKED : UNTICKED)
      }
      required={isAgreement}
    />
  );
}

function ChoiceFieldset({
  children,
  error,
  field,
  ids,
  labelAdornment,
  units,
}: ProfileFieldRowProps & { children: ReactNode }) {
  const describedBy = describedByOf(
    field.hint ? ids.hint : undefined,
    error ? ids.message : undefined,
  );

  return (
    <div className="grid gap-2" data-parity={`field-${field.id}`}>
      <fieldset aria-describedby={describedBy}>
        <Legend
          id={ids.legend}
          required={isRequired(field)}
          trailing={
            <LabelTrailing
              adornment={labelAdornment}
              field={field}
              units={units}
            />
          }
        >
          <LabelLines field={field} />
        </Legend>
        {field.hint && <FieldHint id={ids.hint}>{field.hint}</FieldHint>}
        {children}
      </fieldset>
      <FieldError
        data-parity={`field-${field.id}-error`}
        id={ids.message}
        message={error}
      />
    </div>
  );
}

function RadioChoices({ controller, error, field, ids }: ProfileFieldRowProps) {
  const chosen = textOf(controller.value);

  return (
    <>
      <ChoiceGroup
        aria-invalid={error !== undefined}
        aria-labelledby={ids.legend}
        className="mt-2"
        onValueChange={controller.onChange}
        ref={controller.ref}
        value={chosen}
      >
        {(field.options ?? []).map((option) => (
          <ChoiceOption key={option.value} value={option.value}>
            {option.label}
          </ChoiceOption>
        ))}
      </ChoiceGroup>
      {field.reassurance && chosen === field.reassurance.value && (
        <p className="mt-3 text-sm text-text-secondary">
          {field.reassurance.text}
        </p>
      )}
    </>
  );
}

function ChipChoices({ controller, field }: ProfileFieldRowProps) {
  const chosen = listOf(controller.value);

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {(field.options ?? []).map((option) => (
        <CheckboxChip
          aria-label={option.label}
          isChecked={chosen.includes(option.value)}
          key={option.value}
          onChange={(event) =>
            controller.onChange(
              event.target.checked
                ? withChip(field, chosen, option.value)
                : withoutChip(chosen, option.value),
            )
          }
        >
          {option.label}
        </CheckboxChip>
      ))}
    </div>
  );
}

function LabelledProfileField({
  controller,
  error,
  field,
  labelAdornment,
  units,
}: ProfileFieldRowProps) {
  const equivalent = feetAndInchesHint(field, controller, units);

  return (
    <FieldLayout
      data-parity={`field-${field.id}`}
      error={error}
      errorParity={`field-${field.id}-error`}
      hint={equivalent ?? field.hint}
      hintPlacement={equivalent ? "after-control" : "before-control"}
      label={<LabelLines field={field} />}
      labelAdornment={labelAdornment}
      required={isRequired(field)}
      suffixes={unitSuffixesOf(field, units)}
    >
      {(controlAttributes) => (
        <ProfileFieldInput
          controlAttributes={controlAttributes}
          controller={controller}
          field={field}
          units={units}
        />
      )}
    </FieldLayout>
  );
}

function ControlledProfileField<TValues extends FieldValues>({
  control,
  field,
  labelAdornment,
  units,
  validate,
}: ProfileFieldControlProps<TValues>) {
  const fieldId = useId();
  const { field: controller, fieldState } = useController({
    control,
    name: field.id as FieldPath<TValues>,
    rules: { validate },
  });
  const row: ProfileFieldRowProps = {
    controller,
    error: fieldState.error?.message,
    field,
    ids: {
      hint: `${fieldId}-hint`,
      legend: `${fieldId}-legend`,
      message: `${fieldId}-message`,
    },
    labelAdornment,
    units,
  };

  if (field.kind === "checkbox") return <CheckboxRow {...row} />;

  if (field.kind === "radio") {
    return (
      <ChoiceFieldset {...row}>
        <RadioChoices {...row} />
      </ChoiceFieldset>
    );
  }

  if (field.kind === "chips") {
    return (
      <ChoiceFieldset {...row}>
        <ChipChoices {...row} />
      </ChoiceFieldset>
    );
  }

  return <LabelledProfileField {...row} />;
}

export function ProfileFieldControl<TValues extends FieldValues>(
  props: ProfileFieldControlProps<TValues>,
) {
  const { control, field, units, validate } = props;
  const measureField = measureFieldOf(field);

  if (measureField) {
    return (
      <MeasureField
        control={control}
        field={measureField}
        name={field.id as FieldPath<TValues>}
        units={units}
        validate={validate}
      />
    );
  }

  return <ControlledProfileField {...props} />;
}

export function ProfileFieldRows<TValues extends FieldValues>({
  control,
  fields,
  units = CANONICAL_MEASURE_UNITS,
  adornments,
}: ProfileFieldRowsProps<TValues>) {
  return fields.map((field) => (
    <SettingsBody key={field.id}>
      <ProfileFieldControl
        control={control}
        field={field}
        labelAdornment={adornments?.[field.id]}
        units={units}
      />
    </SettingsBody>
  ));
}
