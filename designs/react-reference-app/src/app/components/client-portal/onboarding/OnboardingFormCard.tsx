import { useEffect, useMemo, type FormEvent, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import type { OnboardingFormAnswers } from '../../../domain/journey';
import type {
  OnboardingField,
  OnboardingFormDefinition,
} from '../../../domain/onboardingSchema';
import { Button } from '../../ui/button';
import { Form } from '../../ui/form';
import { useMeasureUnits } from '../measureUnits';
import { OnboardingFieldControl } from './OnboardingFieldControl';
import {
  ONBOARDING_CARD_CLASS,
  ONBOARDING_HEADING_CLASS,
  ONBOARDING_INTRO_CLASS,
} from './onboardingCard';
import {
  toAnswers,
  toFormValues,
  visibleFields,
  type OnboardingValues,
} from './onboardingValues';

type OnboardingAnswerFormProps = {
  definition: OnboardingFormDefinition;
  answers: OnboardingFormAnswers;
  continueLabel: string;
  onAttempt: () => void;
  onBack: (() => void) | null;
  onChange: (answers: OnboardingFormAnswers) => void;
  onContinue: (answers: OnboardingFormAnswers) => void;
  children?: ReactNode;
};

type OnboardingFormCardProps = OnboardingAnswerFormProps & {
  consent: ReactNode;
  headingRef: (node: HTMLHeadingElement | null) => void;
  unitsChoice: ReactNode;
};

type FieldGroup = { section: string | null; fields: OnboardingField[] };

function groupFields(fields: OnboardingField[]): FieldGroup[] {
  const groups: FieldGroup[] = [];

  for (const field of fields) {
    const section = field.section ?? null;
    const last = groups.at(-1);
    if (last && last.section === section) last.fields.push(field);
    else groups.push({ section, fields: [field] });
  }

  return groups;
}

function OnboardingAnswerForm({
  definition,
  answers,
  continueLabel,
  onAttempt,
  onBack,
  onChange,
  onContinue,
  children,
}: OnboardingAnswerFormProps) {
  const units = useMeasureUnits();
  const form = useForm<OnboardingValues>({
    defaultValues: toFormValues(definition.fields, answers, units),
    mode: 'onBlur',
    shouldUnregister: true,
  });
  const values = form.watch();
  const shown = useMemo(
    () => visibleFields(definition.fields, values),
    [definition, values],
  );

  useEffect(() => {
    const subscription = form.watch((next) =>
      onChange(toAnswers(definition.fields, next as OnboardingValues, units)),
    );

    return () => subscription.unsubscribe();
  }, [form, definition, onChange, units]);

  const handleValid = form.handleSubmit((next) =>
    onContinue(toAnswers(definition.fields, next, units)),
  );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    onAttempt();

    return handleValid(event);
  };

  return (
    <Form {...form}>
      <form className="mt-7 grid gap-6" noValidate onSubmit={submit}>
        {groupFields(shown).map((group) => (
          <div className="grid gap-6" key={group.section ?? 'main'}>
            {group.section && (
              <h3 className="font-serif text-lg text-text-primary">
                {group.section}
              </h3>
            )}
            {group.fields.map((field) => (
              <OnboardingFieldControl
                control={form.control}
                field={field}
                key={field.id}
              />
            ))}
          </div>
        ))}

        {children}

        <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          {onBack ? (
            <Button
              onClick={onBack}
              type="button"
              variant="outline"
              size="lg"
              className="w-full sm:w-auto"
            >
              Back
            </Button>
          ) : (
            <span />
          )}
          <Button
            type="submit"
            variant="default"
            size="lg"
            className="w-full sm:w-auto"
          >
            {continueLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export function OnboardingFormCard({
  consent,
  headingRef,
  unitsChoice,
  ...answerForm
}: OnboardingFormCardProps) {
  const units = useMeasureUnits();
  const { definition } = answerForm;

  return (
    <section
      aria-labelledby="onboarding-form-heading"
      className={ONBOARDING_CARD_CLASS}
    >
      <h2
        className={ONBOARDING_HEADING_CLASS}
        id="onboarding-form-heading"
        ref={headingRef}
        tabIndex={-1}
      >
        {definition.title}
      </h2>
      <p className={ONBOARDING_INTRO_CLASS}>{definition.intro}</p>

      {definition.notice && (
        <p className="mt-5 rounded-card border border-border-subtle bg-surface-quiet/60 px-4 py-3 text-sm leading-relaxed text-text-secondary">
          {definition.notice}
        </p>
      )}

      {consent && <div className="mt-5">{consent}</div>}

      {unitsChoice && <div className="mt-7">{unitsChoice}</div>}

      <OnboardingAnswerForm
        {...answerForm}
        key={`${units.weight}-${units.length}`}
      />
    </section>
  );
}
