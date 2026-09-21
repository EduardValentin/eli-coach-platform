import { DateField } from '../../DateField';
import { useId, type ReactElement } from 'react';
import type { Control, ControllerRenderProps } from 'react-hook-form';
import type { OnboardingField } from '../../../domain/onboardingSchema';
import { CheckboxChip } from '../../CheckboxChip';
import { Input } from '../../ui/input';
import { RadioGroup, RadioGroupItem } from '../../ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { Textarea } from '../../ui/textarea';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../ui/form';
import {
  measureUnitLabel,
  useMeasureUnits,
  type MeasureKind,
  type MeasureUnits,
} from '../measureUnits';
import { entryBounds, fieldRules } from './onboardingValidation';
import {
  asList,
  asText,
  isMeasureField,
  isNumericField,
  type OnboardingValues,
} from './onboardingValues';

type FieldControlProps = {
  control: Control<OnboardingValues>;
  field: OnboardingField;
};

type FieldController = ControllerRenderProps<OnboardingValues>;

const OPTIONAL_SUFFIX = '(optional)';

const NUMERIC_STEPS: Record<string, string> = {
  weight: '0.1',
  height: '0.1',
  circumference: '0.1',
};

function numberEntry(
  field: OnboardingField,
  controller: FieldController,
  units: MeasureUnits,
): ReactElement {
  const bounds = entryBounds(field, units);

  return (
    <Input
      inputMode={isMeasureField(field) ? 'decimal' : 'numeric'}
      max={bounds?.max}
      min={bounds?.min}
      onBlur={controller.onBlur}
      onChange={controller.onChange}
      ref={controller.ref}
      step={NUMERIC_STEPS[field.kind] ?? '1'}
      type="number"
      value={asText(controller.value)}
    />
  );
}

function fieldEntry(
  field: OnboardingField,
  controller: FieldController,
  units: MeasureUnits,
): ReactElement {
  if (field.kind === 'textarea') {
    return (
      <Textarea
        className="min-h-28"
        onBlur={controller.onBlur}
        onChange={controller.onChange}
        ref={controller.ref}
        value={asText(controller.value)}
      />
    );
  }

  if (field.kind === 'date') {
    return (
      <DateField
        disabledDays={{ after: new Date() }}
        onBlur={controller.onBlur}
        onChange={controller.onChange}
        value={asText(controller.value)}
      />
    );
  }

  if (isNumericField(field)) return numberEntry(field, controller, units);

  return (
    <Input
      onBlur={controller.onBlur}
      onChange={controller.onChange}
      ref={controller.ref}
      type="text"
      value={asText(controller.value)}
    />
  );
}

function LabelText({ field, unit }: { field: OnboardingField; unit: string | null }) {
  const suffixes = [
    unit ? `(${unit})` : null,
    field.unitSuffix ? `(${field.unitSuffix})` : null,
    field.requirement === 'optional' ? OPTIONAL_SUFFIX : null,
  ].filter((part): part is string => part !== null);

  return (
    <>
      {field.label}
      {suffixes.map((suffix) => (
        <span key={suffix} className="font-normal text-text-secondary">
          {suffix}
        </span>
      ))}
    </>
  );
}

function RadioOption({ value, label }: { value: string; label: string }) {
  const id = useId();

  return (
    <div className="flex items-center gap-2">
      <RadioGroupItem id={id} value={value} />
      <label htmlFor={id} className="text-sm text-text-primary">
        {label}
      </label>
    </div>
  );
}

export function OnboardingFieldControl({ control, field }: FieldControlProps) {
  const units = useMeasureUnits();
  const unit = isMeasureField(field)
    ? measureUnitLabel(field.kind as MeasureKind, units)
    : null;

  return (
    <FormField
      control={control}
      name={field.id}
      rules={fieldRules(field, units)}
      render={({ field: controller }) => {
        if (field.kind === 'radio' || field.kind === 'chips') {
          return (
            <FormItem>
              <FormControl>
                <fieldset>
                  <legend className="mb-1 flex flex-wrap items-baseline gap-1.5 text-sm font-medium text-text-label">
                    <LabelText field={field} unit={unit} />
                  </legend>
                  {field.hint && <FormDescription>{field.hint}</FormDescription>}
                  {field.kind === 'radio' ? (
                    <RadioGroup
                      className="mt-2 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-x-6"
                      onValueChange={controller.onChange}
                      value={asText(controller.value)}
                    >
                      {(field.options ?? []).map((option) => (
                        <RadioOption
                          key={option.value}
                          label={option.label}
                          value={option.value}
                        />
                      ))}
                    </RadioGroup>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(field.options ?? []).map((option) => (
                        <CheckboxChip
                          aria-label={option.label}
                          key={option.value}
                          checked={asList(controller.value).includes(option.value)}
                          onCheckedChange={(checked) =>
                            controller.onChange(
                              checked
                                ? [...asList(controller.value), option.value]
                                : asList(controller.value).filter(
                                    (picked) => picked !== option.value,
                                  ),
                            )
                          }
                        >
                          {option.label}
                        </CheckboxChip>
                      ))}
                    </div>
                  )}
                </fieldset>
              </FormControl>
              <FormMessage />
            </FormItem>
          );
        }

        return (
          <FormItem>
            <FormLabel className="flex flex-wrap items-baseline gap-1.5">
              <LabelText field={field} unit={unit} />
            </FormLabel>
            {field.hint && <FormDescription>{field.hint}</FormDescription>}
            {field.kind === 'select' ? (
              <Select onValueChange={controller.onChange} value={asText(controller.value)}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose one" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(field.options ?? []).map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <FormControl>{fieldEntry(field, controller, units)}</FormControl>
            )}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
