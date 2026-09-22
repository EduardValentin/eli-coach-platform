import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { useClientJourneys } from '../../../context/ClientJourneyContext';
import type {
  ClientJourney,
  DetailRequest,
  OnboardingFormAnswers,
  OnboardingFormId,
} from '../../../domain/journey';
import { humaniseQuestionId } from '../../../domain/onboardingAnswers';
import {
  findOnboardingField,
  formIdOfField,
  type OnboardingField,
} from '../../../domain/onboardingSchema';
import { answerRequest as sendAnswers } from '../../../services/onboardingService';
import { Button } from '../../ThemeButton';
import { Alert } from '../../ui/alert';
import { Form } from '../../ui/form';
import { useMeasureUnits } from '../measureUnits';
import { OnboardingFieldControl } from './OnboardingFieldControl';
import {
  ONBOARDING_CARD_CLASS,
  ONBOARDING_HEADING_CLASS,
} from './onboardingCard';
import { toAnswers, toFormValues, type OnboardingValues } from './onboardingValues';

const SEND_PROBLEM =
  "Your answers could not be sent just now. Try again in a moment.";

const FALLBACK_FORM_ID: OnboardingFormId = 'goal-availability';

function fieldFor(questionId: string): OnboardingField {
  return (
    findOnboardingField(questionId) ?? {
      id: questionId,
      label: humaniseQuestionId(questionId),
      kind: 'textarea',
      requirement: 'required',
    }
  );
}

function currentAnswers(
  journey: ClientJourney,
  fields: readonly OnboardingField[],
): OnboardingFormAnswers {
  return Object.fromEntries(
    fields.map((field) => [
      field.id,
      journey.onboarding.answers[formIdOfField(field.id) ?? FALLBACK_FORM_ID]?.[
        field.id
      ] ?? null,
    ]),
  );
}

function merged(
  journey: ClientJourney,
  answers: OnboardingFormAnswers,
): ClientJourney['onboarding']['answers'] {
  const next = { ...journey.onboarding.answers };

  for (const [questionId, answer] of Object.entries(answers)) {
    const formId = formIdOfField(questionId) ?? FALLBACK_FORM_ID;
    next[formId] = { ...next[formId], [questionId]: answer };
  }

  return next;
}

export function AnswerRequestCard({ request }: { request: DetailRequest }) {
  const navigate = useNavigate();
  const { demoJourney, answerRequest, saveOnboardingDraft } = useClientJourneys();
  const units = useMeasureUnits();
  const [problem, setProblem] = useState<string | null>(null);

  const fields = useMemo(
    () => request.questionIds.map(fieldFor),
    [request.questionIds],
  );

  const form = useForm<OnboardingValues>({
    defaultValues: toFormValues(fields, currentAnswers(demoJourney, fields), units),
  });

  const send = form.handleSubmit(async (values) => {
    setProblem(null);

    try {
      const answered = await sendAnswers(
        demoJourney.callId,
        request,
        toAnswers(fields, values, units),
      );
      saveOnboardingDraft(demoJourney.callId, {
        answers: merged(demoJourney, answered.answers),
        currentFormIndex: demoJourney.onboarding.currentFormIndex,
        consents: demoJourney.onboarding.consents,
      });
      answerRequest(demoJourney.callId, answered.answeredAt);
      navigate('/portal');
    } catch {
      setProblem(SEND_PROBLEM);
    }
  });

  return (
    <section aria-labelledby="answer-request-heading" className={ONBOARDING_CARD_CLASS}>
      <h2 className={ONBOARDING_HEADING_CLASS} id="answer-request-heading">
        What your coach asked
      </h2>
      <p className="mt-3 rounded-card border border-brand/10 bg-brand/5 px-4 py-3 text-sm leading-relaxed text-text-primary">
        {request.message}
      </p>

      {problem && <Alert className="mt-4">{problem}</Alert>}

      <Form {...form}>
        <form className="mt-7 grid gap-6" noValidate onSubmit={send}>
          {fields.map((field) => (
            <OnboardingFieldControl control={form.control} field={field} key={field.id} />
          ))}

          <div className="mt-2 flex">
            <Button disabled={form.formState.isSubmitting} type="submit" width="full-below-sm">
              {form.formState.isSubmitting ? 'Sending…' : 'Send my answers'}
            </Button>
          </div>
        </form>
      </Form>
    </section>
  );
}
