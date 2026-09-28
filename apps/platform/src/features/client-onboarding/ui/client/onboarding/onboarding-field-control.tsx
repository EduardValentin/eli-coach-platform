import {
  applyExclusiveOptions,
  entryBounds,
  type OnboardingField,
} from "@eli-coach-platform/domain/client-onboarding";
import {
  formatFeetAndInches,
  measureStep,
  measureUnitLabel,
  type MeasureUnits,
} from "@eli-coach-platform/domain/unit-preference";
import { DateField } from "@eli-coach-platform/ui/calendar";
import { cn } from "@eli-coach-platform/ui/lib";
import {
  Checkbox,
  CheckboxChip,
  ChoiceGroup,
  ChoiceOption,
  FieldError,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@eli-coach-platform/ui/primitives";
import { useId, type ReactElement } from "react";
import {
  useController,
  type Control,
  type ControllerRenderProps,
} from "react-hook-form";

import {
  ONBOARDING_AGREEMENT_BOX_CLASS,
  ONBOARDING_HINT_CLASS,
  ONBOARDING_LEGEND_CLASS,
} from "./onboarding-card";
import { validateField } from "./onboarding-validation";
import {
  asList,
  asText,
  isNumericField,
  isTicked,
  measureKindOf,
  tickedValue,
  type OnboardingValues,
} from "./onboarding-values";
import { useMeasureUnits } from "./unit-preference-store";

type OnboardingFieldControlProps = {
  control: Control<OnboardingValues>;
  field: OnboardingField;
  formFields: readonly OnboardingField[];
};

type FieldController = ControllerRenderProps<OnboardingValues>;

type FieldIds = {
  control: string;
  hint: string;
  message: string;
};

type FieldEntryProps = {
  controller: FieldController;
  describedBy: string | undefined;
  field: OnboardingField;
  ids: FieldIds;
  invalid: boolean;
  units: MeasureUnits;
};

type FieldLayoutProps = Omit<FieldEntryProps, "describedBy"> & {
  error: string | undefined;
};

const OPTIONAL_SUFFIX = "(optional)";

const WHOLE_STEP = "1";

const SELECT_PLACEHOLDER = "Choose one";

function describedByOf(
  ids: FieldIds,
  { hasHint, invalid }: { hasHint: boolean; invalid: boolean },
): string | undefined {
  const described = [
    hasHint ? ids.hint : null,
    invalid ? ids.message : null,
  ].filter((id): id is string => id !== null);

  return described.length > 0 ? described.join(" ") : undefined;
}

function unitOf(field: OnboardingField, units: MeasureUnits): string | null {
  const measureKind = measureKindOf(field);

  return measureKind ? measureUnitLabel(measureKind, units) : null;
}

function entryStep(field: OnboardingField, units: MeasureUnits): string {
  if (field.step) return field.step;

  const measureKind = measureKindOf(field);

  return measureKind ? measureStep(measureKind, units) : WHOLE_STEP;
}

function feetAndInchesHint(
  field: OnboardingField,
  controller: FieldController,
  units: MeasureUnits,
): string | null {
  if (field.kind !== "height" || units.length !== "in") return null;

  const entered = Number(asText(controller.value));

  return Number.isFinite(entered) && entered > 0
    ? formatFeetAndInches(entered)
    : null;
}

function LabelText({
  field,
  unit,
}: {
  field: OnboardingField;
  unit: string | null;
}) {
  const suffixes = [
    unit ? `(${unit})` : null,
    field.unitSuffix ? `(${field.unitSuffix})` : null,
    field.requirement === "optional" ? OPTIONAL_SUFFIX : null,
  ].filter((part): part is string => part !== null);

  return (
    <>
      {field.label.split("\n").map((line, index) => (
        <span className={cn({ block: index > 0 })} key={line}>
          {line}
        </span>
      ))}
      {suffixes.map((suffix) => (
        <span className="font-normal text-text-secondary" key={suffix}>
          {suffix}
        </span>
      ))}
    </>
  );
}

function NumberEntry({
  controller,
  describedBy,
  field,
  ids,
  invalid,
  units,
}: FieldEntryProps) {
  const bounds = entryBounds(field, units);

  return (
    <Input
      aria-describedby={describedBy}
      aria-invalid={invalid}
      id={ids.control}
      inputMode={measureKindOf(field) ? "decimal" : "numeric"}
      max={bounds?.max}
      min={bounds?.min}
      onBlur={controller.onBlur}
      onChange={controller.onChange}
      placeholder={field.placeholder}
      ref={controller.ref}
      step={entryStep(field, units)}
      type="number"
      value={asText(controller.value)}
    />
  );
}

function SelectEntry({
  controller,
  describedBy,
  field,
  ids,
  invalid,
}: FieldEntryProps) {
  return (
    <Select
      onValueChange={controller.onChange}
      value={asText(controller.value)}
    >
      <SelectTrigger
        aria-describedby={describedBy}
        aria-invalid={invalid}
        className="w-full"
        id={ids.control}
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
  const { controller, describedBy, field, ids, invalid } = props;

  if (field.kind === "select") return <SelectEntry {...props} />;
  if (isNumericField(field)) return <NumberEntry {...props} />;

  if (field.kind === "textarea") {
    return (
      <Textarea
        aria-describedby={describedBy}
        aria-invalid={invalid}
        className="min-h-28"
        id={ids.control}
        onBlur={controller.onBlur}
        onChange={controller.onChange}
        placeholder={field.placeholder}
        ref={controller.ref}
        value={asText(controller.value)}
      />
    );
  }

  if (field.kind === "date") {
    return (
      <DateField
        aria-describedby={describedBy}
        aria-invalid={invalid}
        calendarLabel={field.label}
        disabledDays={{ after: new Date() }}
        id={ids.control}
        onBlur={controller.onBlur}
        onChange={controller.onChange}
        ref={controller.ref}
        value={asText(controller.value)}
      />
    );
  }

  return (
    <Input
      aria-describedby={describedBy}
      aria-invalid={invalid}
      id={ids.control}
      onBlur={controller.onBlur}
      onChange={controller.onChange}
      placeholder={field.placeholder}
      ref={controller.ref}
      type="text"
      value={asText(controller.value)}
    />
  );
}

function CheckboxField({ controller, error, field, ids }: FieldLayoutProps) {
  const isDeclaration = field.requirement === "required";
  const invalid = error !== undefined;

  return (
    <div
      className={cn("grid gap-2", { "-mt-2": !isDeclaration })}
      data-parity={`field-${field.id}`}
    >
      <div
        className={cn({
          "flex items-start gap-3": isDeclaration,
          [ONBOARDING_AGREEMENT_BOX_CLASS]: isDeclaration,
          "flex items-center gap-2": !isDeclaration,
        })}
      >
        <Checkbox
          aria-describedby={invalid ? ids.message : undefined}
          aria-invalid={invalid}
          checked={isTicked(controller.value)}
          className={cn({ "mt-0.5": isDeclaration })}
          id={ids.control}
          onCheckedChange={(next) =>
            controller.onChange(tickedValue(next === true))
          }
          ref={controller.ref}
        />
        <label
          className={cn("text-sm text-text-primary", {
            "leading-relaxed": isDeclaration,
          })}
          htmlFor={ids.control}
        >
          {field.label}
        </label>
      </div>
      <FieldError id={ids.message} message={error} />
    </div>
  );
}

function nextChoices(
  field: OnboardingField,
  {
    chosen,
    option,
    ticked,
  }: { chosen: string[]; option: string; ticked: boolean },
): string[] {
  const next = ticked
    ? [...chosen, option]
    : chosen.filter((picked) => picked !== option);

  return applyExclusiveOptions(field, chosen, next);
}

function ChoiceField({
  controller,
  error,
  field,
  ids,
  units,
}: FieldLayoutProps) {
  const legendId = useId();
  const invalid = error !== undefined;
  const describedBy = describedByOf(ids, {
    hasHint: field.hint !== undefined,
    invalid,
  });
  const chosen = asList(controller.value);

  return (
    <div className="grid gap-2" data-parity={`field-${field.id}`}>
      <fieldset aria-describedby={describedBy}>
        <legend className={ONBOARDING_LEGEND_CLASS} id={legendId}>
          <LabelText field={field} unit={unitOf(field, units)} />
        </legend>
        {field.hint && (
          <p className={ONBOARDING_HINT_CLASS} id={ids.hint}>
            {field.hint}
          </p>
        )}
        {field.kind === "radio" ? (
          <>
            <ChoiceGroup
              aria-invalid={invalid}
              aria-labelledby={legendId}
              className="mt-2"
              onValueChange={controller.onChange}
              ref={controller.ref}
              value={asText(controller.value)}
            >
              {(field.options ?? []).map((option) => (
                <ChoiceOption key={option.value} value={option.value}>
                  {option.label}
                </ChoiceOption>
              ))}
            </ChoiceGroup>
            {field.reassurance &&
              asText(controller.value) === field.reassurance.value && (
                <p className="mt-3 text-sm text-text-secondary">
                  {field.reassurance.text}
                </p>
              )}
          </>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {(field.options ?? []).map((option) => (
              <CheckboxChip
                aria-label={option.label}
                isChecked={chosen.includes(option.value)}
                key={option.value}
                onChange={(event) =>
                  controller.onChange(
                    nextChoices(field, {
                      chosen,
                      option: option.value,
                      ticked: event.target.checked,
                    }),
                  )
                }
              >
                {option.label}
              </CheckboxChip>
            ))}
          </div>
        )}
      </fieldset>
      <FieldError id={ids.message} message={error} />
    </div>
  );
}

function EntryField({
  controller,
  error,
  field,
  ids,
  units,
}: FieldLayoutProps) {
  const invalid = error !== undefined;
  const equivalent = feetAndInchesHint(field, controller, units);
  const hint = equivalent ?? field.hint;
  const describedBy = describedByOf(ids, {
    hasHint: hint !== undefined,
    invalid,
  });
  const hintLine = hint && (
    <p className={ONBOARDING_HINT_CLASS} id={ids.hint}>
      {hint}
    </p>
  );

  return (
    <div className="grid gap-2" data-parity={`field-${field.id}`}>
      <Label
        className="flex flex-wrap items-baseline gap-1.5"
        data-error={invalid}
        htmlFor={ids.control}
      >
        <LabelText field={field} unit={unitOf(field, units)} />
      </Label>
      {!equivalent && hintLine}
      <FieldEntry
        controller={controller}
        describedBy={describedBy}
        field={field}
        ids={ids}
        invalid={invalid}
        units={units}
      />
      {equivalent && hintLine}
      <FieldError id={ids.message} message={error} />
    </div>
  );
}

export function OnboardingFieldControl({
  control,
  field,
  formFields,
}: OnboardingFieldControlProps) {
  const units = useMeasureUnits();
  const controlId = useId();
  const { field: controller, fieldState } = useController({
    control,
    name: field.id,
    rules: { validate: validateField(field, { fields: formFields, units }) },
  });
  const layout: FieldLayoutProps = {
    controller,
    error: fieldState.error?.message,
    field,
    ids: {
      control: controlId,
      hint: `${controlId}-hint`,
      message: `${controlId}-message`,
    },
    invalid: fieldState.invalid,
    units,
  };

  if (field.kind === "checkbox") return <CheckboxField {...layout} />;
  if (field.kind === "radio" || field.kind === "chips") {
    return <ChoiceField {...layout} />;
  }

  return <EntryField {...layout} />;
}
