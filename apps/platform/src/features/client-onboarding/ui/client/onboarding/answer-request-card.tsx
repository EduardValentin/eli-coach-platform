import {
  ONBOARDING_FORMS,
  type OnboardingField,
  type OnboardingFormId,
} from "@eli-coach-platform/domain/client-onboarding";
import type { MeasureUnits } from "@eli-coach-platform/domain/unit-preference";
import { cn } from "@eli-coach-platform/ui/lib";
import {
  Alert,
  Button,
  buttonVariants,
  cardVariants,
} from "@eli-coach-platform/ui/primitives";
import { useId, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";

import { CLIENT_PORTAL_PATH } from "~/features/accounts/contracts/paths";
import type {
  AskedAnswers,
  OnboardingAnswerPage,
  QuestionId,
  SubmissionProblem,
} from "~/features/client-onboarding/contracts/onboarding";
import { ANSWER_REQUEST_COPY } from "~/features/client-onboarding/contracts/onboarding-review-copy";

import { answerDetails } from "./onboarding-api-client";
import { OnboardingFieldControl } from "./onboarding-field-control";
import {
  toAnswers,
  toFormValues,
  type OnboardingValues,
} from "./onboarding-values";
import { useMeasureUnits } from "./unit-preference-store";

type AskedForm = { formId: OnboardingFormId; fields: OnboardingField[] };

type AnswerRequestCardProps = { page: OnboardingAnswerPage };

function definitionOf({ formId, fieldId }: QuestionId): OnboardingField | null {
  const form = ONBOARDING_FORMS.find((candidate) => candidate.id === formId);

  return form?.fields.find((field) => field.id === fieldId) ?? null;
}

function askedFormsOf(questions: readonly QuestionId[]): AskedForm[] {
  const fieldsByForm = new Map<OnboardingFormId, OnboardingField[]>();

  for (const question of questions) {
    const field = definitionOf(question);
    if (!field) continue;

    fieldsByForm.set(question.formId, [
      ...(fieldsByForm.get(question.formId) ?? []),
      field,
    ]);
  }

  return [...fieldsByForm].map(([formId, fields]) => ({ formId, fields }));
}

function prefilledValues(
  forms: readonly AskedForm[],
  answers: AskedAnswers,
  units: MeasureUnits,
): OnboardingValues {
  return Object.assign(
    {},
    ...forms.map(({ fields, formId }) =>
      toFormValues(fields, answers[formId] ?? {}, units),
    ),
  ) as OnboardingValues;
}

function sentAnswersOf(
  forms: readonly AskedForm[],
  values: OnboardingValues,
  units: MeasureUnits,
): AskedAnswers {
  return Object.fromEntries(
    forms.map(({ fields, formId }) => [
      formId,
      toAnswers(fields, values, units),
    ]),
  );
}

export function AnswerRequestCard({ page }: AnswerRequestCardProps) {
  const navigate = useNavigate();
  const units = useMeasureUnits();
  const headingId = useId();
  const [sendProblem, setSendProblem] = useState<string | null>(null);
  const forms = useMemo(
    () => askedFormsOf(page.request.fields),
    [page.request.fields],
  );
  const form = useForm<OnboardingValues>({
    defaultValues: prefilledValues(forms, page.answers, units),
  });
  const sending = form.formState.isSubmitting;

  const showServerProblems = (problems: readonly SubmissionProblem[]) => {
    for (const problem of problems) {
      form.setError(problem.fieldId, {
        message: problem.message,
        type: "server",
      });
    }
  };

  const send = form.handleSubmit(async (values) => {
    setSendProblem(null);

    const outcome = await answerDetails({
      answers: sentAnswersOf(forms, values, units),
    });

    if (outcome.kind === "accepted") {
      await navigate(outcome.redirectTo);
      return;
    }

    if (outcome.kind === "invalid") {
      showServerProblems(outcome.problems);
      return;
    }

    setSendProblem(ANSWER_REQUEST_COPY.sendProblem);
  });

  return (
    <section
      aria-labelledby={headingId}
      className={cn(cardVariants({ variant: "panel" }), "p-6 sm:p-8 lg:p-10")}
      data-parity-root="AnswerRequestCard"
    >
      <h2
        className="font-heading text-2xl tracking-tight text-text-primary focus:outline-none"
        id={headingId}
      >
        {ANSWER_REQUEST_COPY.heading}
      </h2>
      <p
        className="mt-3 rounded-card border border-primary/10 bg-primary/5 px-4 py-3 text-sm leading-relaxed text-text-primary"
        data-parity="request-note"
      >
        {page.request.note}
      </p>

      {sendProblem && <Alert className="mt-4">{sendProblem}</Alert>}

      <form
        className="mt-7 grid gap-6"
        noValidate
        onSubmit={(event) => {
          void send(event);
        }}
      >
        {forms.map(({ fields }) =>
          fields.map((field) => (
            <OnboardingFieldControl
              control={form.control}
              field={field}
              formFields={fields}
              key={field.id}
            />
          )),
        )}

        <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Link
            className={buttonVariants({
              size: "md",
              variant: "ghost",
              width: "full-below-sm",
            })}
            data-parity="not-now"
            to={CLIENT_PORTAL_PATH}
          >
            {ANSWER_REQUEST_COPY.notNow}
          </Link>
          <Button
            data-parity="send-answers"
            disabled={sending}
            size="md"
            type="submit"
            variant="primary"
            width="full-below-sm"
          >
            {sending ? ANSWER_REQUEST_COPY.sending : ANSWER_REQUEST_COPY.send}
          </Button>
        </div>
      </form>
    </section>
  );
}
