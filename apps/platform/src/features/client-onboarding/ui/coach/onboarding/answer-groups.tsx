import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Checkbox,
} from "@eli-coach-platform/ui/primitives";
import { cn } from "@eli-coach-platform/ui/lib";

import type { QuestionId } from "~/features/client-onboarding/contracts/onboarding";
import type {
  ReviewAnswer,
  ReviewForm,
} from "~/features/client-onboarding/contracts/onboarding-review";
import {
  ASKED_AGAIN,
  answeredCount,
  askedAgainCount,
  REVIEW_DIALOG,
} from "~/features/client-onboarding/contracts/onboarding-review-copy";

import { includesQuestion } from "./question-ids";
import { ReviewAnswerValue } from "./review-answer-value";

type ReviewSession = {
  flagged: readonly QuestionId[];
  onToggleFlag: (question: QuestionId) => void;
};

type AnswersView = {
  asked: readonly QuestionId[];
  onOpenForms: (formIds: string[]) => void;
  openForms: string[];
  review: ReviewSession | null;
};

type AnswerGroupsProps = {
  forms: ReviewForm[];
  view: AnswersView;
};

type AnswerQuestionProps = {
  answer: ReviewAnswer;
  question: QuestionId;
  review: ReviewSession | null;
};

type AnswerRowProps = AnswerQuestionProps & {
  asked: readonly QuestionId[];
};

function AnswerQuestion({ answer, question, review }: AnswerQuestionProps) {
  if (!review) {
    return <>{answer.label}</>;
  }

  return (
    <label className="flex cursor-pointer items-start gap-3">
      <Checkbox
        checked={includesQuestion(review.flagged, question)}
        className="mt-0.5"
        data-parity={`flag-${answer.fieldId}`}
        onCheckedChange={() => review.onToggleFlag(question)}
      />
      <span>
        <span className="sr-only">{REVIEW_DIALOG.flagLabel} </span>
        {answer.label}
      </span>
    </label>
  );
}

function AnswerRow({ answer, asked, question, review }: AnswerRowProps) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:gap-6">
      <dt className="text-sm text-text-secondary">
        <AnswerQuestion answer={answer} question={question} review={review} />
      </dt>
      <dd
        className={cn(
          "flex flex-wrap items-center justify-between gap-2 text-sm text-text-primary",
          { "pl-8 sm:pl-0": review !== null },
        )}
      >
        <ReviewAnswerValue answer={answer} />
        {includesQuestion(asked, question) ? (
          <Badge data-parity="asked-again" tone="pending">
            {ASKED_AGAIN}
          </Badge>
        ) : null}
      </dd>
    </div>
  );
}

function askedInForm(form: ReviewForm, asked: readonly QuestionId[]): number {
  return form.answers.filter((answer) =>
    includesQuestion(asked, { fieldId: answer.fieldId, formId: form.formId }),
  ).length;
}

export function AnswerGroups({ forms, view }: AnswerGroupsProps) {
  return (
    <Accordion
      className="rounded-card border border-border-subtle bg-surface-quiet/60 px-4 sm:px-5"
      onValueChange={view.onOpenForms}
      type="multiple"
      value={view.openForms}
    >
      {forms.map((form) => {
        const askedCount = askedInForm(form, view.asked);

        return (
          <AccordionItem key={form.formId} value={form.formId}>
            <AccordionTrigger data-parity={`form-${form.formId}`}>
              <span className="flex flex-1 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="text-base font-medium">{form.title}</span>
                <span
                  className="flex items-center gap-2 text-xs font-normal text-text-secondary"
                  data-parity="answered-count"
                >
                  {askedCount > 0 ? (
                    <Badge tone="pending">{askedAgainCount(askedCount)}</Badge>
                  ) : null}
                  {answeredCount(form.answered, form.total)}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <dl className="divide-y divide-border-subtle rounded-field bg-surface-base px-4">
                {form.answers.map((answer) => (
                  <AnswerRow
                    answer={answer}
                    asked={view.asked}
                    key={answer.fieldId}
                    question={{ fieldId: answer.fieldId, formId: form.formId }}
                    review={view.review}
                  />
                ))}
              </dl>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
