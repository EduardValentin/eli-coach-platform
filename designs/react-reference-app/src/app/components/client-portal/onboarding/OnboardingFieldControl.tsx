import { DateField } from '../../DateField';
import { useId, type ReactElement } from 'react';
import type { Control, ControllerRenderProps } from 'react-hook-form';
import type { OnboardingField } from '../../../domain/onboardingSchema';
import { CheckboxChip } from '../../CheckboxChip';
import { ChoiceGroup, ChoiceOption } from '../../ChoiceGroup';
import { Checkbox } from '../../ui/checkbox';
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
      placeholder={field.placeholder}
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
        placeholder={field.placeholder}
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
      placeholder={field.placeholder}
      ref={controller.ref}
      type="text"
      value={asText(controller.value)}
    />
  );
}

function nextChipsValue(
  field: OnboardingField,
  current: string | string[] | undefined,
  option: string,
  checked: boolean,
): string[] {
  const selected = asList(current);

  if (!checked) return selected.filter((picked) => picked !== option);
  if (field.exclusiveOptions?.includes(option)) return [option];

  const withoutExclusive = selected.filter(
    (picked) => !field.exclusiveOptions?.includes(picked),
  );

  return [...withoutExclusive, option];
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
        if (field.kind === 'checkbox') {
          const checked = asText(controller.value) === 'true';
          const isDeclaration = field.requirement === 'required';

          return (
            <FormItem className={isDeclaration ? undefined : '-mt-2'}>
              <FormControl>
                <div
                  className={
                    isDeclaration
                      ? 'flex items-start gap-3 rounded-card border border-border-subtle bg-surface-quiet/60 p-4'
                      : 'flex items-center gap-2'
                  }
                >
                  <Checkbox
                    checked={checked}
                    className={isDeclaration ? 'mt-0.5' : undefined}
                    id={legendId}
                    onCheckedChange={(next) =>
                      controller.onChange(next === true ? 'true' : 'false')
                    }
                  />
                  <label
                    className={
                      isDeclaration
                        ? 'text-sm leading-relaxed text-text-primary'
                        : 'text-sm text-text-primary'
                    }
                    htmlFor={legendId}
                  >
                    {field.label}
                  </label>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          );
        }

        if (field.kind === 'radio' || field.kind === 'chips') {
          return (
            <FormItem>
              <FormControl>
                <fieldset>
                  <legend className={ONBOARDING_LEGEND_CLASS} id={legendId}>
                    <LabelText field={field} unit={unit} />
                  </legend>
                  {field.hint && (
                    <FormDescription>{field.hint}</FormDescription>
                  )}
                  {field.kind === 'radio' ? (
                    <>
                      <ChoiceGroup
                        aria-labelledby={legendId}
                        className="mt-2"
                        onValueChange={controller.onChange}
                        value={asText(controller.value)}
                      >
                        {(field.options ?? []).map((option) => (
                          <ChoiceOption key={option.value} value={option.value}>
                            {option.label}
                          </ChoiceOption>
                        ))}
                      </ChoiceGroup>
                      {field.reassurance &&
                        asText(controller.value) ===
                          field.reassurance.value && (
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
                          key={option.value}
                          checked={asList(controller.value).includes(
                            option.value,
                          )}
                          onCheckedChange={(checked) =>
                            controller.onChange(
                              nextChipsValue(
                                field,
                                controller.value,
                                option.value,
                                checked === true,
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
              <Select
                onValueChange={controller.onChange}
                value={asText(controller.value)}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={field.placeholder ?? 'Choose one'}
                    />
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
