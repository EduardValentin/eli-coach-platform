import type {
  OnboardingField,
  OnboardingFormAnswers,
  OnboardingFormDefinition,
} from "@eli-coach-platform/domain/client-onboarding";
import { cn } from "@eli-coach-platform/ui/lib";
import {
  Button,
  cardVariants,
  Legend,
} from "@eli-coach-platform/ui/primitives";
import { useCallback, useEffect, useId, useMemo, type ReactNode } from "react";
import { useForm } from "react-hook-form";

import type { SubmissionProblem } from "~/features/client-onboarding/contracts/onboarding";

import { OnboardingFieldControl } from "./onboarding-field-control";
import {
  toAnswers,
  toFormValues,
  visibleFields,
  type OnboardingValues,
} from "./onboarding-values";
import { useMeasureUnits } from "./unit-preference-store";

export type ContinueAttempt =
  { kind: "complete"; answers: OnboardingFormAnswers } | { kind: "incomplete" };

export type ContinueAction = {
  label: string;
  availability: "enabled" | "disabled";
};

type OnboardingAnswerFormProps = {
  answers: OnboardingFormAnswers;
  children?: ReactNode;
  continueAction: ContinueAction;
  definition: OnboardingFormDefinition;
  onBack: (() => void) | null;
  onChange: (answers: OnboardingFormAnswers) => void;
  onContinue: (attempt: ContinueAttempt) => void;
  problems: readonly SubmissionProblem[];
};

type OnboardingFormCardProps = OnboardingAnswerFormProps & {
  consent: ReactNode;
  headingRef: (heading: HTMLHeadingElement | null) => void;
  intro: string;
  unitsChoice: ReactNode;
};

type FieldGroup = { section: string | null; fields: OnboardingField[] };

type FieldItem =
  | { kind: "legend"; legend: string; fields: OnboardingField[] }
  | { kind: "field"; field: OnboardingField };

function groupFields(fields: readonly OnboardingField[]): FieldGroup[] {
  const groups: FieldGroup[] = [];

  for (const field of fields) {
    const section = field.section ?? null;
    const last = groups.at(-1);
    if (last && last.section === section) last.fields.push(field);
    else groups.push({ section, fields: [field] });
  }

  return groups;
}

function groupByLegend(fields: readonly OnboardingField[]): FieldItem[] {
  const items: FieldItem[] = [];

  for (const field of fields) {
    const last = items.at(-1);

    if (!field.legend) {
      items.push({ kind: "field", field });
    } else if (last?.kind === "legend" && last.legend === field.legend) {
      last.fields.push(field);
    } else {
      items.push({ kind: "legend", legend: field.legend, fields: [field] });
    }
  }

  return items;
}

function OnboardingAnswerForm({
  answers,
  children,
  continueAction,
  definition,
  onBack,
  onChange,
  onContinue,
  problems,
}: OnboardingAnswerFormProps) {
  const units = useMeasureUnits();
  const form = useForm<OnboardingValues>({
    defaultValues: toFormValues(definition.fields, answers, units),
    mode: "onBlur",
    shouldUnregister: true,
  });
  const values = form.watch();
  const shown = useMemo(
    () => visibleFields(definition.fields, values, units),
    [definition, values, units],
  );

  const answersFrom = useCallback(
    (formValues: OnboardingValues) =>
      toAnswers(
        visibleFields(definition.fields, formValues, units),
        formValues,
        units,
      ),
    [definition, units],
  );

  useEffect(() => {
    const subscription = form.watch((next) => {
      onChange(answersFrom(next as OnboardingValues));
    });

    return () => subscription.unsubscribe();
  }, [form, answersFrom, onChange]);

  useEffect(() => {
    for (const problem of problems) {
      form.setError(problem.fieldId, {
        message: problem.message,
        type: "server",
      });
    }
  }, [form, problems]);

  const continueWith = form.handleSubmit(
    (next) => onContinue({ kind: "complete", answers: answersFrom(next) }),
    () => onContinue({ kind: "incomplete" }),
  );

  const fieldControl = (field: OnboardingField) => (
    <OnboardingFieldControl
      control={form.control}
      field={field}
      formFields={definition.fields}
      key={field.id}
    />
  );

  return (
    <form
      className="mt-7 grid gap-6"
      noValidate
      onSubmit={(event) => {
        void continueWith(event);
      }}
    >
      {groupFields(shown).map((group) => (
        <div className="grid gap-6" key={group.section ?? "main"}>
          {group.section && (
            <h3 className="font-heading text-lg text-text-primary">
              {group.section}
            </h3>
          )}
          {groupByLegend(group.fields).map((item) =>
            item.kind === "legend" ? (
              <fieldset key={item.legend}>
                <Legend>{item.legend}</Legend>
                <div className="mt-2 grid gap-4 sm:grid-cols-2">
                  {item.fields.map(fieldControl)}
                </div>
              </fieldset>
            ) : (
              fieldControl(item.field)
            ),
          )}
        </div>
      ))}

      {definition.footnote && (
        <p className="mt-6 text-xs text-text-secondary">
          {definition.footnote}
        </p>
      )}

      {children}

      <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        {onBack ? (
          <Button
            data-parity="back"
            onClick={onBack}
            size="md"
            variant="outline"
            width="full-below-sm"
          >
            Back
          </Button>
        ) : (
          <span />
        )}
        <Button
          data-parity="continue"
          disabled={continueAction.availability === "disabled"}
          size="md"
          type="submit"
          variant="primary"
          width="full-below-sm"
        >
          {continueAction.label}
        </Button>
      </div>
    </form>
  );
}

export function OnboardingFormCard({
  consent,
  headingRef,
  intro,
  unitsChoice,
  ...answerForm
}: OnboardingFormCardProps) {
  const units = useMeasureUnits();
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className={cn(cardVariants({ variant: "panel" }), "p-6 sm:p-8 lg:p-10")}
    >
      <h2
        className="font-heading text-2xl tracking-tight text-text-primary focus:outline-none"
        data-parity="form-heading"
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
      >
        {answerForm.definition.title}
      </h2>
      <p className="mt-2 text-sm text-text-secondary" data-parity="form-intro">
        {intro}
      </p>

      {consent && <div className="mt-5">{consent}</div>}

      {unitsChoice && (
        <div className="mt-7" data-parity="units-choice">
          {unitsChoice}
        </div>
      )}

      <OnboardingAnswerForm
        {...answerForm}
        key={`${units.weight}-${units.length}`}
      />
    </section>
  );
}
