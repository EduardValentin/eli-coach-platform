import { DateField } from '../../DateField';
import { useId, type ReactElement } from 'react';
import type { Control, ControllerRenderProps } from 'react-hook-form';
import type { OnboardingField } from '../../../domain/onboardingSchema';
import { CheckboxChip } from '../../CheckboxChip';
import { ChoiceGroup, ChoiceOption } from '../../ChoiceGroup';
import { Input } from '../../ui/input';
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
import { formatFeetAndInches } from '../../../utils/units';
import {
  measureStep,
  measureUnitLabel,
  useMeasureUnits,
  type MeasureKind,
  type MeasureUnits,
} from '../measureUnits';
import { ONBOARDING_LEGEND_CLASS } from './onboardingCard';
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

const WHOLE_STEP = '1';

function entryStep(field: OnboardingField, units: MeasureUnits): string {
  if (field.step) return field.step;

  return isMeasureField(field)
    ? measureStep(field.kind as MeasureKind, units)
    : WHOLE_STEP;
}

function feetAndInchesHint(
  field: OnboardingField,
  value: string | string[] | undefined,
  units: MeasureUnits,
): string | null {
  if (field.kind !== 'height' || units.length !== 'in') return null;

  const entered = Number(asText(value));

  return Number.isFinite(entered) && entered > 0
    ? formatFeetAndInches(entered)
    : null;
}

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
      step={entryStep(field, units)}
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

export function OnboardingFieldControl({ control, field }: FieldControlProps) {
  const units = useMeasureUnits();
  const legendId = useId();
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
                  <legend className={ONBOARDING_LEGEND_CLASS} id={legendId}>
                    <LabelText field={field} unit={unit} />
                  </legend>
                  {field.hint && <FormDescription>{field.hint}</FormDescription>}
                  {field.kind === 'radio' ? (
                    <ChoiceGroup
                      aria-labelledby={legendId}
                      className="mt-2 sm:max-w-md"
                      onValueChange={controller.onChange}
                      value={asText(controller.value)}
                    >
                      {(field.options ?? []).map((option) => (
                        <ChoiceOption key={option.value} value={option.value}>
                          {option.label}
                        </ChoiceOption>
                      ))}
                    </ChoiceGroup>
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

        const equivalent = feetAndInchesHint(field, controller.value, units);

        return (
          <FormItem>
            <FormLabel className="flex flex-wrap items-baseline gap-1.5">
              <LabelText field={field} unit={unit} />
            </FormLabel>
            {!equivalent && field.hint && (
              <FormDescription>{field.hint}</FormDescription>
            )}
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
            {equivalent && <FormDescription>{equivalent}</FormDescription>}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
