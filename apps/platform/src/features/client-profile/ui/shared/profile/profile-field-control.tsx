import {
  formatFeetAndInches,
  measureStep,
  measureUnitLabel,
  type MeasureUnits,
} from "@eli-coach-platform/domain/client-settings";
import { describedByOf } from "@eli-coach-platform/ui/lib";
import { SettingsBody } from "@eli-coach-platform/ui/portal";
import {
  CheckboxChip,
  ChoiceGroup,
  ChoiceOption,
  FieldError,
  FieldHint,
  FieldLayout,
  Input,
  Legend,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  type FieldControlAttributes,
} from "@eli-coach-platform/ui/primitives";
import { useId, type ReactElement, type ReactNode } from "react";
import {
  useController,
  type Control,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

import { MeasureField } from "~/features/client-profile/ui/shared/measure-field/measure-field";

import {
  measureBounds,
  nextChipsValue,
  type ProfileField,
} from "./profile-fields";

type FieldController = Pick<
  ControllerRenderProps,
  "onBlur" | "onChange" | "ref" | "value"
>;

type ProfileFieldControlProps<TValues extends FieldValues> = {
  control: Control<TValues>;
  field: ProfileField;
  labelAdornment?: ReactNode;
};

type ProfileFieldRowsProps<TValues extends FieldValues> = {
  control: Control<TValues>;
  fields: readonly ProfileField[];
  adornments?: Partial<Record<string, ReactNode>>;
};

type FieldLayoutProps = {
  controller: FieldController;
  error: string | undefined;
  field: ProfileField;
  labelAdornment: ReactNode;
  units: MeasureUnits;
};

type FieldEntryProps = {
  controller: FieldController;
  controlAttributes: FieldControlAttributes;
  field: ProfileField;
  units: MeasureUnits;
};

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

function unitSuffixesOf(field: ProfileField, units: MeasureUnits) {
  if (field.kind !== "height" && field.kind !== "weight") return [];

  return [
    {
      parity: `field-${field.id}-suffix-unit`,
      text: `(${measureUnitLabel(field.kind, units)})`,
    },
  ];
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

function SelectEntry({
  controller,
  controlAttributes,
  field,
}: FieldEntryProps) {
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

function FieldEntry(props: FieldEntryProps): ReactElement {
  const { controller, controlAttributes, field, units } = props;

  if (field.kind === "select") return <SelectEntry {...props} />;

  if (field.kind === "height" || field.kind === "weight") {
    const bounds = measureBounds(field, units);

    return (
      <Input
        {...controlAttributes}
        inputMode="decimal"
        max={bounds?.max}
        min={bounds?.min}
        onBlur={controller.onBlur}
        onChange={controller.onChange}
        ref={controller.ref}
        step={measureStep(field.kind, units)}
        type="number"
        value={textOf(controller.value)}
      />
    );
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

function EntryField({
  controller,
  error,
  field,
  labelAdornment,
  units,
}: FieldLayoutProps) {
  const equivalent = feetAndInchesHint(field, controller, units);

  return (
    <FieldLayout
      data-parity={`field-${field.id}`}
      error={error}
      errorParity={`field-${field.id}-error`}
      hint={equivalent ?? field.hint}
      hintPlacement={equivalent ? "after-control" : "before-control"}
      label={<span>{field.label}</span>}
      labelAdornment={labelAdornment}
      required={isRequired(field)}
      suffixes={unitSuffixesOf(field, units)}
    >
      {(controlAttributes) => (
        <FieldEntry
          controlAttributes={controlAttributes}
          controller={controller}
          field={field}
          units={units}
        />
      )}
    </FieldLayout>
  );
}

function ChoiceField({
  controller,
  error,
  field,
  labelAdornment,
}: FieldLayoutProps) {
  const fieldId = useId();
  const ids = {
    hint: `${fieldId}-hint`,
    legend: `${fieldId}-legend`,
    message: `${fieldId}-message`,
  };
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
          trailing={labelAdornment}
        >
          <span>{field.label}</span>
        </Legend>
        {field.hint && <FieldHint id={ids.hint}>{field.hint}</FieldHint>}
        {field.kind === "radio" ? (
          <ChoiceGroup
            aria-invalid={error !== undefined}
            aria-labelledby={ids.legend}
            className="mt-2"
            onValueChange={controller.onChange}
            ref={controller.ref}
            value={textOf(controller.value)}
          >
            {(field.options ?? []).map((option) => (
              <ChoiceOption key={option.value} value={option.value}>
                {option.label}
              </ChoiceOption>
            ))}
          </ChoiceGroup>
        ) : (
          <ChipChoices controller={controller} field={field} />
        )}
      </fieldset>
      <FieldError
        data-parity={`field-${field.id}-error`}
        id={ids.message}
        message={error}
      />
    </div>
  );
}

function ChipChoices({
  controller,
  field,
}: Pick<FieldLayoutProps, "controller" | "field">) {
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
              nextChipsValue(field, chosen, {
                option: option.value,
                checked: event.target.checked,
              }),
            )
          }
        >
          {option.label}
        </CheckboxChip>
      ))}
    </div>
  );
}

function ProfileFieldControl<TValues extends FieldValues>({
  control,
  field,
  labelAdornment,
  units,
}: ProfileFieldControlProps<TValues> & { units: MeasureUnits }) {
  const { field: controller, fieldState } = useController({
    control,
    name: field.id as FieldPath<TValues>,
  });
  const layout: FieldLayoutProps = {
    controller,
    error: fieldState.error?.message,
    field,
    labelAdornment,
    units,
  };

  if (field.kind === "radio" || field.kind === "chips") {
    return <ChoiceField {...layout} />;
  }

  return <EntryField {...layout} />;
}

export function ProfileFieldRows<TValues extends FieldValues>({
  control,
  fields,
  adornments,
  units,
}: ProfileFieldRowsProps<TValues> & { units: MeasureUnits }) {
  return fields.map((field) => (
    <SettingsBody key={field.id}>
      {field.kind === "weight" && field.range ? (
        <MeasureField
          control={control}
          field={{ ...field, kind: "weight", range: field.range }}
          name={field.id as FieldPath<TValues>}
          units={units}
        />
      ) : (
        <ProfileFieldControl
          control={control}
          field={field}
          labelAdornment={adornments?.[field.id]}
          units={units}
        />
      )}
    </SettingsBody>
  ));
}
