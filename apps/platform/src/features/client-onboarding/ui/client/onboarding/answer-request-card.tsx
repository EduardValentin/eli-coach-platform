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
import { useEffect, useEffectEvent, useId, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useFetcher, useNavigate } from "react-router";

import { CLIENT_PORTAL_PATH } from "~/features/accounts/contracts/paths";
import {
  submissionAcceptedSchema,
  submissionProblemsSchema,
  type AnswerDetailsRequest,
  type AskedAnswers,
  type OnboardingAnswerPage,
  type QuestionId,
  type SubmissionProblem,
} from "~/features/client-onboarding/contracts/onboarding";
import { ANSWER_REQUEST_COPY } from "~/features/client-onboarding/contracts/onboarding-review-copy";
import { CLIENT_ONBOARDING_API_PATHS } from "~/features/client-onboarding/contracts/paths";

import { OnboardingFieldControl } from "./onboarding-field-control";
import {
  toAnswers,
  toFormValues,
  type OnboardingValues,
} from "./onboarding-values";
import { useMeasureUnits } from "./unit-preference-store";

type AskedForm = { formId: OnboardingFormId; fields: OnboardingField[] };

type AnswerRequestCardProps = { page: OnboardingAnswerPage };

type AnswerDetailsOutcome =
  | { kind: "accepted"; redirectTo: string }
  | { kind: "invalid"; problems: SubmissionProblem[] }
  | { kind: "failed" };

const ANSWER_DETAILS_FAILED: AnswerDetailsOutcome = { kind: "failed" };

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

function answerDetailsOutcomeOf(response: unknown): AnswerDetailsOutcome {
  const accepted = submissionAcceptedSchema.safeParse(response);
  if (accepted.success) {
    return { kind: "accepted", redirectTo: accepted.data.redirectTo };
  }

  const problems = submissionProblemsSchema.safeParse(response);

  return problems.success
    ? { kind: "invalid", problems: problems.data.problems }
    : ANSWER_DETAILS_FAILED;
}

export function AnswerRequestCard({ page }: AnswerRequestCardProps) {
  const navigate = useNavigate();
  const units = useMeasureUnits();
  const headingId = useId();
  const { data, state, submit } = useFetcher<unknown>();
  const [sendProblem, setSendProblem] = useState<string | null>(null);
  const forms = useMemo(
    () => askedFormsOf(page.request.fields),
    [page.request.fields],
  );
  const form = useForm<OnboardingValues>({
    defaultValues: prefilledValues(forms, page.answers, units),
  });
  const outcome = useMemo(
    () => (data === undefined ? null : answerDetailsOutcomeOf(data)),
    [data],
  );
  const sending = state !== "idle" || outcome?.kind === "accepted";

  const showServerProblems = (problems: readonly SubmissionProblem[]) => {
    for (const problem of problems) {
      form.setError(problem.fieldId, {
        message: problem.message,
        type: "server",
      });
    }
  };

  const settle = useEffectEvent((settled: AnswerDetailsOutcome) => {
    if (settled.kind === "accepted") {
      void navigate(settled.redirectTo);
      return;
    }

    if (settled.kind === "invalid") {
      showServerProblems(settled.problems);
      return;
    }

    setSendProblem(ANSWER_REQUEST_COPY.sendProblem);
  });

  useEffect(() => {
    if (outcome) {
      settle(outcome);
    }
  }, [outcome]);

  const send = form.handleSubmit((values) => {
    setSendProblem(null);

    const request: AnswerDetailsRequest = {
      answers: sentAnswersOf(forms, values, units),
    };

    void submit(request, {
      action: CLIENT_ONBOARDING_API_PATHS.detailAnswers,
      defaultShouldRevalidate: false,
      encType: "application/json",
      method: "post",
    });
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
