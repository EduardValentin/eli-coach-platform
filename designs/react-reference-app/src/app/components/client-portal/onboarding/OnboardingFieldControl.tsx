import { DateField } from '../../DateField';
import { useId, type ReactElement } from 'react';
import type { Control, ControllerRenderProps } from 'react-hook-form';
import type { OnboardingField } from '../../../domain/onboardingSchema';
import { CheckboxChip } from '../../CheckboxChip';
import { ChoiceGroup, ChoiceOption } from '../../ChoiceGroup';
import { CheckboxField } from '../../CheckboxField';
import { Input } from '../../ui/input';
import { LabelSuffix, Legend } from '../../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { Textarea } from '../../ui/textarea';
import { cn } from '../../ui/utils';
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
        data-parity={`field-${field.id}-trigger`}
        disabledDays={{ after: new Date() }}
        onBlur={controller.onBlur}
        onChange={controller.onChange}
        ref={controller.ref}
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

function unitSuffixesOf(
  field: OnboardingField,
  unit: string | null,
): string[] {
  return [unit, field.unitSuffix]
    .filter((suffix): suffix is string => Boolean(suffix))
    .map((suffix) => `(${suffix})`);
}

function LabelLines({ field }: { field: OnboardingField }) {
  return (
    <>
      {field.label.split('\n').map((line, index) => (
        <span className={index > 0 ? 'block' : undefined} key={line}>
          {line}
        </span>
      ))}
    </>
  );
}

function UnitSuffixes({
  field,
  unit,
}: {
  field: OnboardingField;
  unit: string | null;
}) {
  return (
    <>
      {unitSuffixesOf(field, unit).map((suffix) => (
        <LabelSuffix data-parity={`field-${field.id}-suffix-unit`} key={suffix}>
          {suffix}
        </LabelSuffix>
      ))}
    </>
  );
}

export function OnboardingFieldControl({ control, field }: FieldControlProps) {
  const units = useMeasureUnits();
  const legendId = useId();
  const parityHook = `field-${field.id}`;
  const required = field.requirement === 'required';
  const unit = isMeasureField(field)
    ? measureUnitLabel(field.kind as MeasureKind, units)
    : null;

  return (
    <FormField
      control={control}
      name={field.id}
      rules={fieldRules(field, units)}
      render={({ field: controller, fieldState }) => {
        if (field.kind === 'checkbox') {
          const isAgreement = required;

          return (
            <CheckboxField
              checkboxParity={`${parityHook}-checkbox`}
              checkboxRef={controller.ref}
              checked={asText(controller.value) === 'true'}
              className={cn({ '-mt-2': !isAgreement })}
              data-parity={parityHook}
              error={fieldState.error?.message}
              errorParity={`${parityHook}-error`}
              frame={isAgreement ? 'inset' : 'none'}
              label={field.label}
              layout={isAgreement ? 'statement' : 'inline'}
              onCheckedChange={(checked) =>
                controller.onChange(checked ? 'true' : 'false')
              }
              required={required}
            />
          );
        }

        if (field.kind === 'radio' || field.kind === 'chips') {
          return (
            <FormItem data-parity={parityHook}>
              <FormControl>
                <fieldset>
                  <Legend
                    id={legendId}
                    required={required}
                    trailing={<UnitSuffixes field={field} unit={unit} />}
                  >
                    <LabelLines field={field} />
                  </Legend>
                  {field.hint && (
                    <FormDescription>{field.hint}</FormDescription>
                  )}
                  {field.kind === 'radio' ? (
                    <>
                      <ChoiceGroup
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
              <FormMessage data-parity={`${parityHook}-error`} />
            </FormItem>
          );
        }

        const equivalent = feetAndInchesHint(field, controller.value, units);

        return (
          <FormItem data-parity={parityHook}>
            <FormLabel
              layout="wrap"
              required={required}
              trailing={<UnitSuffixes field={field} unit={unit} />}
            >
              <LabelLines field={field} />
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
                  <SelectTrigger
                    className="w-full"
                    data-parity={`${parityHook}-trigger`}
                  >
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
            <FormMessage data-parity={`${parityHook}-error`} />
          </FormItem>
        );
      }}
    />
  );
}
