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
  CheckboxChip,
  CheckboxField,
  ChoiceGroup,
  ChoiceOption,
  FieldError,
  FieldHint,
  Input,
  Label,
  LabelSuffix,
  Legend,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@eli-coach-platform/ui/primitives";
import { useId, type ReactElement, type ReactNode } from "react";
import {
  useController,
  type Control,
  type ControllerRenderProps,
} from "react-hook-form";

import { OPTIONAL_SUFFIX } from "~/features/client-onboarding/contracts/onboarding-copy";

import { validateField } from "./onboarding-validation";
import {
  asList,
  asText,
  isNumericField,
  isTicked,
  measureKindOf,
  TICKED,
  UNTICKED,
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
  legend: string;
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

type FieldLayoutProps = Omit<FieldEntryProps, "describedBy" | "invalid"> & {
  error: string | undefined;
};

const WHOLE_STEP = "1";

const SELECT_PLACEHOLDER = "Choose one";

function describedByOf(...ids: (string | undefined)[]): string | undefined {
  const described = ids.filter((id): id is string => id !== undefined);

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

type SuffixRole = "unit" | "optional";

type LabelSuffixEntry = { role: SuffixRole; text: string };

function labelSuffixesOf(
  field: OnboardingField,
  unit: string | null,
): LabelSuffixEntry[] {
  const suffixes: (LabelSuffixEntry | null)[] = [
    unit ? { role: "unit", text: `(${unit})` } : null,
    field.unitSuffix ? { role: "unit", text: `(${field.unitSuffix})` } : null,
    field.requirement === "optional"
      ? { role: "optional", text: OPTIONAL_SUFFIX }
      : null,
  ];

  return suffixes.filter(
    (suffix): suffix is LabelSuffixEntry => suffix !== null,
  );
}

function LabelText({
  field,
  unit,
}: {
  field: OnboardingField;
  unit: string | null;
}) {
  return (
    <>
      {field.label.split("\n").map((line, index) => (
        <span className={cn({ block: index > 0 })} key={line}>
          {line}
        </span>
      ))}
      {labelSuffixesOf(field, unit).map((suffix) => (
        <LabelSuffix
          data-parity={`field-${field.id}-suffix-${suffix.role}`}
          key={suffix.text}
        >
          {suffix.text}
        </LabelSuffix>
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
        data-parity={`field-${field.id}-trigger`}
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
        data-parity={`field-${field.id}-trigger`}
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

function CheckboxAnswer({ controller, error, field }: FieldLayoutProps) {
  const isDeclaration = field.requirement === "required";

  return (
    <CheckboxField
      checkboxParity={`field-${field.id}-checkbox`}
      checkboxRef={controller.ref}
      checked={isTicked(controller.value)}
      className={cn({ "-mt-2": !isDeclaration })}
      data-parity={`field-${field.id}`}
      error={error}
      errorParity={`field-${field.id}-error`}
      frame={isDeclaration ? "inset" : "none"}
      label={field.label}
      layout={isDeclaration ? "statement" : "inline"}
      onCheckedChange={(checked) =>
        controller.onChange(checked ? TICKED : UNTICKED)
      }
    />
  );
}

function withChoice(
  field: OnboardingField,
  chosen: string[],
  option: string,
): string[] {
  return applyExclusiveOptions(field, chosen, [...chosen, option]);
}

function withoutChoice(chosen: string[], option: string): string[] {
  return chosen.filter((picked) => picked !== option);
}

function ChoiceFieldset({
  children,
  error,
  field,
  ids,
  units,
}: FieldLayoutProps & { children: ReactNode }) {
  const describedBy = describedByOf(
    field.hint ? ids.hint : undefined,
    error ? ids.message : undefined,
  );

  return (
    <div className="grid gap-2" data-parity={`field-${field.id}`}>
      <fieldset aria-describedby={describedBy}>
        <Legend id={ids.legend}>
          <LabelText field={field} unit={unitOf(field, units)} />
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

function RadioChoices({ controller, error, field, ids }: FieldLayoutProps) {
  const chosen = asText(controller.value);

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

function ChipChoices({ controller, field }: FieldLayoutProps) {
  const chosen = asList(controller.value);

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
                ? withChoice(field, chosen, option.value)
                : withoutChoice(chosen, option.value),
            )
          }
        >
          {option.label}
        </CheckboxChip>
      ))}
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
  const describedBy = describedByOf(
    hint ? ids.hint : undefined,
    invalid ? ids.message : undefined,
  );
  const hintLine = hint && <FieldHint id={ids.hint}>{hint}</FieldHint>;

  return (
    <div className="grid gap-2" data-parity={`field-${field.id}`}>
      <Label htmlFor={ids.control} invalid={invalid} layout="wrap">
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
      <FieldError
        data-parity={`field-${field.id}-error`}
        id={ids.message}
        message={error}
      />
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
      legend: `${controlId}-legend`,
      message: `${controlId}-message`,
    },
    units,
  };

  if (field.kind === "checkbox") return <CheckboxAnswer {...layout} />;

  if (field.kind === "radio") {
    return (
      <ChoiceFieldset {...layout}>
        <RadioChoices {...layout} />
      </ChoiceFieldset>
    );
  }

  if (field.kind === "chips") {
    return (
      <ChoiceFieldset {...layout}>
        <ChipChoices {...layout} />
      </ChoiceFieldset>
    );
  }

  return <EntryField {...layout} />;
}
