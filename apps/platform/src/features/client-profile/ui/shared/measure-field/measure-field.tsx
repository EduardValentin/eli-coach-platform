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
} from "@eli-coach-platform/domain/unit-preference";
import {
  FieldError,
  FieldHint,
  Input,
  Label,
  LabelSuffix,
} from "@eli-coach-platform/ui/primitives";
import { useId } from "react";
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

const OPTIONAL_SUFFIX = "(optional)";

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

function describedByOf(...ids: (string | undefined)[]): string | undefined {
  const described = ids.filter((id): id is string => id !== undefined);

  return described.length > 0 ? described.join(" ") : undefined;
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
  const controlId = useId();
  const hintId = `${controlId}-hint`;
  const messageId = `${controlId}-message`;
  const { field: controller, fieldState } = useController({
    control,
    name,
    rules: { validate: validate ?? validateReading(field, units) },
  });
  const error = fieldState.error?.message;
  const invalid = error !== undefined;

  return (
    <div className="grid gap-2" data-parity={`field-${field.id}`}>
      <Label htmlFor={controlId} invalid={invalid} layout="wrap">
        <span>{field.label}</span>
        <LabelSuffix data-parity={`field-${field.id}-suffix-unit`}>
          {`(${measureUnitLabel(field.kind, units)})`}
        </LabelSuffix>
        {field.requirement === "optional" && (
          <LabelSuffix data-parity={`field-${field.id}-suffix-optional`}>
            {OPTIONAL_SUFFIX}
          </LabelSuffix>
        )}
      </Label>
      {field.hint && <FieldHint id={hintId}>{field.hint}</FieldHint>}
      <Input
        aria-describedby={describedByOf(
          field.hint ? hintId : undefined,
          invalid ? messageId : undefined,
        )}
        aria-invalid={invalid}
        id={controlId}
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
      <FieldError
        data-parity={`field-${field.id}-error`}
        id={messageId}
        message={error}
      />
    </div>
  );
}
