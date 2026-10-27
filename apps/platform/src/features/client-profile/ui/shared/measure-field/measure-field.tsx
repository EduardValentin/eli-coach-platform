import {
  measurementProblem,
  type MeasurementField,
  type MeasurementRule,
} from "@eli-coach-platform/domain/measurement";
import {
  measureStep,
  measureUnitLabel,
  toCanonicalMeasure,
  toDisplayMeasure,
  type MeasureUnits,
} from "@eli-coach-platform/domain/client-settings";
import { FieldLayout, Input } from "~/shared/design-system/primitives";
import {
  useController,
  type Control,
  type FieldPath,
  type FieldPathValue,
  type FieldValues,
  type Validate,
} from "react-hook-form";

export type MeasureFieldDefinition = MeasurementRule &
  Pick<MeasurementField, "label"> & {
    id: string;
    hint?: string;
  };

type MeasureFieldProps<
  TValues extends FieldValues,
  TName extends FieldPath<TValues>,
> = {
  control: Control<TValues>;
  field: MeasureFieldDefinition;
  name: TName;
  units: MeasureUnits;
  validate?: Validate<FieldPathValue<TValues, TName>, TValues>;
};

function enteredText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function canonicalReading(
  field: MeasureFieldDefinition,
  text: string,
  units: MeasureUnits,
): number | undefined {
  const entered = Number(text);

  if (text.trim() === "" || !Number.isFinite(entered)) return undefined;

  return toCanonicalMeasure(field.kind, entered, units);
}

function validateReading(field: MeasureFieldDefinition, units: MeasureUnits) {
  return (value: unknown) =>
    measurementProblem(
      field,
      canonicalReading(field, enteredText(value), units),
      units,
    ) ?? true;
}

function displayBound(
  field: MeasureFieldDefinition,
  canonical: number,
  units: MeasureUnits,
): number {
  return Math.round(toDisplayMeasure(field.kind, canonical, units));
}

function unitSuffixOf(field: MeasureFieldDefinition, units: MeasureUnits) {
  return {
    parity: `field-${field.id}-suffix-unit`,
    text: `(${measureUnitLabel(field.kind, units)})`,
  };
}

export function MeasureField<
  TValues extends FieldValues,
  TName extends FieldPath<TValues>,
>({
  control,
  field,
  name,
  units,
  validate,
}: MeasureFieldProps<TValues, TName>) {
  const { field: controller, fieldState } = useController({
    control,
    name,
    rules: { validate: validate ?? validateReading(field, units) },
  });

  return (
    <FieldLayout
      data-parity={`field-${field.id}`}
      error={fieldState.error?.message}
      errorParity={`field-${field.id}-error`}
      hint={field.hint}
      label={<span>{field.label}</span>}
      required={field.requirement === "required"}
      suffixes={[unitSuffixOf(field, units)]}
    >
      {(controlAttributes) => (
        <Input
          {...controlAttributes}
          inputMode="decimal"
          max={displayBound(field, field.range.max, units)}
          min={displayBound(field, field.range.min, units)}
          onBlur={controller.onBlur}
          onChange={controller.onChange}
          ref={controller.ref}
          step={measureStep(field.kind, units)}
          type="number"
          value={enteredText(controller.value)}
        />
      )}
    </FieldLayout>
  );
}
