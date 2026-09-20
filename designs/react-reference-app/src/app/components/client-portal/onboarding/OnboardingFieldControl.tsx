import { DateField } from '../../DateField';
import { useId } from 'react';
import type { Control, RegisterOptions } from 'react-hook-form';
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
import { measureUnitLabel, useMeasureUnits, type MeasureKind } from '../measureUnits';
import {
  asList,
  asText,
  isMeasureField,
  type OnboardingValues,
} from './onboardingValues';

type FieldControlProps = {
  control: Control<OnboardingValues>;
  field: OnboardingField;
};

const OPTIONAL_SUFFIX = '(optional)';

const REQUIRED_MESSAGES: Record<string, string> = {
  radio: 'Pick one of these.',
  select: 'Choose one of these.',
  chips: 'Pick at least one.',
  number: 'Add a number here.',
  date: 'Pick a date.',
};

const NUMBER_MESSAGE = 'Use numbers only.';

function requiredMessage(field: OnboardingField): string {
  if (isMeasureField(field)) return REQUIRED_MESSAGES.number;

  return REQUIRED_MESSAGES[field.kind] ?? 'Write a short answer here.';
}

function rulesFor(field: OnboardingField): RegisterOptions<OnboardingValues> {
  const numeric = isMeasureField(field) || field.kind === 'number';
  const required = field.requirement === 'required';

  return {
    validate: (value) => {
      const empty =
        field.kind === 'chips'
          ? asList(value).length === 0
          : asText(value).trim() === '';

      if (empty) return required ? requiredMessage(field) : true;
      if (!numeric) return true;

      const entered = Number(asText(value));

      return Number.isFinite(entered) && entered > 0 ? true : NUMBER_MESSAGE;
    },
  };
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
      rules={rulesFor(field)}
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
              <FormControl>
                {field.kind === 'textarea' ? (
                  <Textarea
                    className="min-h-28"
                    onChange={controller.onChange}
                    onBlur={controller.onBlur}
                    ref={controller.ref}
                    value={asText(controller.value)}
                  />
                ) : field.kind === 'date' ? (
                  <DateField
                    value={asText(controller.value)}
                    onChange={controller.onChange}
                    onBlur={controller.onBlur}
                    disabledDays={{ after: new Date() }}
                  />
                ) : (
                  <Input
                    inputMode={
                      isMeasureField(field) || field.kind === 'number'
                        ? 'decimal'
                        : undefined
                    }
                    onChange={controller.onChange}
                    onBlur={controller.onBlur}
                    ref={controller.ref}
                    type="text"
                    value={asText(controller.value)}
                  />
                )}
              </FormControl>
            )}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
