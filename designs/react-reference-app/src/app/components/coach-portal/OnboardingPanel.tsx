import { useState } from 'react';
import { ClipboardList, MessageSquareText, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { cn } from '../ui/utils';
import { useClientJourneys } from '../../context/ClientJourneyContext';
import { clientStatus, isCancelledOrEnded } from '../../domain/clientStatus';
import {
  canStartWork,
  workStartDate,
  type CoachingSubscription,
} from '../../domain/coachingSubscription';
import {
  awaitsCoachReview,
  isBeforeStage,
  type ClientJourney,
  type DetailRequest,
  type JourneyStage,
} from '../../domain/journey';
import {
  reviewForms,
  type ReviewAnswer,
  type ReviewForm,
} from '../../domain/onboardingAnswers';
import {
  PARQ_QUESTION_IDS,
  screeningOutcome,
  withholdsNutritionAdvice,
} from '../../domain/safetyScreening';
import { clientPronouns, formatJourneyDate } from '../../utils/journeyLabels';
import { CollapsiblePortalWidget } from '../CollapsiblePortalWidget';
import { PortalWidget } from '../PortalWidget';
import { IconHint } from '../IconHint';
import { WIDGET_SUBHEADING_CLASS } from '../typography';
import { ClientStatusBadge } from './ClientStatusBadge';
import { OnboardingReviewDialog } from './OnboardingReviewDialog';
import { ReviewAnswerValue } from './ReviewAnswerValue';
import { useAppState } from '../../context/AppContext';

const REVIEW_ACTIONS: Partial<Record<JourneyStage, string>> = {
  submitted: 'Review answers',
  reviewing: 'Continue review',
};

export type ReviewSession = {
  flagged: readonly string[];
  toggleFlag: (questionId: string) => void;
};

export type AnswersView = {
  openForms: string[];
  onOpenForms: (formIds: string[]) => void;
  review: ReviewSession | null;
  asked?: ReadonlySet<string>;
};

const NO_QUESTIONS: ReadonlySet<string> = new Set();

function openRequest(journey: ClientJourney): DetailRequest | null {
  const request = journey.review.requests.at(-1);
  if (journey.stage !== 'needs-details' || !request || request.answeredAt) {
    return null;
  }
  return request;
}

function screeningWarnings(journey: ClientJourney): string[] {
  const outcome = screeningOutcome(
    journey.onboarding,
    journey.profile.identity,
    new Date(),
  );
  const yesCount = PARQ_QUESTION_IDS.filter(
    (id) => journey.onboarding.answers['safety-screening'][id] === 'Yes',
  ).length;

  const warnings: string[] = [];
  if (outcome === 'needs-review') {
    warnings.push(
      `Safety screening needs a look: ${yesCount} yes ${yesCount === 1 ? 'answer' : 'answers'}`,
    );
  }
  if (outcome === 'manual') {
    warnings.push('Safety screening: manual screening (age)');
  }
  if (withholdsNutritionAdvice(journey.onboarding)) {
    warnings.push('Nutrition advice on hold');
  }
  return warnings;
}

function ScreeningWarning({ journey }: { journey: ClientJourney }) {
  const warnings = screeningWarnings(journey);
  if (warnings.length === 0) return null;

  return (
    <IconHint
      label={warnings.join('. ')}
      icon={<TriangleAlert aria-hidden="true" size={16} />}
      tone="danger"
      parity="screening-warning"
    >
      {warnings.map((warning) => (
        <p key={warning}>{warning}</p>
      ))}
    </IconHint>
  );
}

function AnswerQuestion({
  answer,
  review,
}: {
  answer: ReviewAnswer;
  review: ReviewSession | null;
}) {
  if (!review) return <>{answer.label}</>;

  return (
    <label className="flex cursor-pointer items-start gap-3">
      <Checkbox
        className="mt-0.5"
        data-parity={`flag-${answer.questionId}`}
        checked={review.flagged.includes(answer.questionId)}
        onCheckedChange={() => review.toggleFlag(answer.questionId)}
      />
      <span>
        <span className="sr-only">Flag </span>
        {answer.label}
      </span>
    </label>
  );
}

function AnswerRow({
  answer,
  review,
  asked,
}: {
  answer: ReviewAnswer;
  review: ReviewSession | null;
  asked: boolean;
}) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:gap-6">
      <dt className="text-sm text-text-secondary">
        <AnswerQuestion answer={answer} review={review} />
      </dt>
      <dd
        className={cn(
          'flex flex-wrap items-center justify-between gap-2 text-sm text-text-primary',
          review && 'pl-8 sm:pl-0',
        )}
      >
        <ReviewAnswerValue answer={answer} />
        {asked && (
          <Badge tone="pending" data-parity="asked-again">
            Asked again
          </Badge>
        )}
      </dd>
    </div>
  );
}

function askedCount(form: ReviewForm, asked: ReadonlySet<string>): number {
  return form.answers.filter((answer) => asked.has(answer.questionId)).length;
}

export function AnswerGroups({
  forms,
  view,
}: {
  forms: ReviewForm[];
  view: AnswersView;
}) {
  const asked = view.asked ?? NO_QUESTIONS;

  return (
    <Accordion
      type="multiple"
      value={view.openForms}
      onValueChange={view.onOpenForms}
      className="rounded-card border border-border-subtle bg-surface-quiet/60 px-4 sm:px-5"
      data-parity="answers"
    >
      {forms.map((form) => (
        <AccordionItem
          key={form.formId}
          value={form.formId}
          data-parity={`answer-group-${form.formId}`}
        >
          <AccordionTrigger data-parity={`form-${form.formId}`}>
            <span className="flex flex-1 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="text-base font-medium">{form.title}</span>
              <span
                className="flex items-center gap-2 text-xs font-normal text-text-secondary"
                data-parity="answered-count"
              >
                {askedCount(form, asked) > 0 && (
                  <Badge tone="pending">
                    {askedCount(form, asked)} asked again
                  </Badge>
                )}
                {form.answeredCount} of {form.answers.length} answered
              </span>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <dl className="divide-y divide-border-subtle rounded-field bg-surface-base px-4">
              {form.answers.map((answer) => (
                <AnswerRow
                  answer={answer}
                  key={answer.questionId}
                  review={view.review}
                  asked={asked.has(answer.questionId)}
                />
              ))}
            </dl>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

function RequestStatus({ request }: { request: DetailRequest }) {
  const count = request.questionIds.length;

  return (
    <div
      className="space-y-1 text-sm text-text-secondary"
      data-parity="request-status"
    >
      <p className="flex items-center gap-2">
        <MessageSquareText aria-hidden="true" size={16} />
        Waiting on {count} {count === 1 ? 'answer' : 'answers'} · asked{' '}
        {formatJourneyDate(request.createdAt)}
      </p>
      <blockquote className="border-l-2 border-border-subtle pl-3 italic">
        {request.message}
      </blockquote>
    </div>
  );
}

function WorkStartNote({
  subscription,
  clientPossessive,
}: {
  subscription: CoachingSubscription | undefined;
  clientPossessive: string;
}) {
  const startsOn =
    subscription && !canStartWork(subscription, new Date())
      ? workStartDate(subscription)
      : null;

  if (!startsOn) return null;

  return (
    <p className="text-xs text-text-secondary">
      You can start building {clientPossessive} program on{' '}
      {formatJourneyDate(startsOn)}.
    </p>
  );
}

function StageActions({
  journey,
  onReview,
  onApprove,
}: {
  journey: ClientJourney;
  onReview: () => void;
  onApprove: () => void;
}) {
  const { appState } = useAppState();

  if (!awaitsCoachReview(journey.stage)) return null;
  if (isCancelledOrEnded(journey, new Date())) return null;

  const reviewAction = REVIEW_ACTIONS[journey.stage];
  const { possessive } = clientPronouns(journey.profile.identity.gender);
  const isPostMvp = appState.prototypeMode === 'post-mvp';
  const canApprove =
    journey.stage === 'submitted' || journey.stage === 'reviewing';

  if (!isPostMvp && !reviewAction) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-3 sm:flex-row">
        {reviewAction && (
          <Button
            variant="outline"
            onClick={onReview}
            data-parity="review-action"
          >
            {reviewAction}
          </Button>
        )}
        {!isPostMvp && canApprove && (
          <Button
            variant="primary"
            onClick={onApprove}
            data-parity="approve-action"
          >
            Approve answers
          </Button>
        )}
      </div>
      {isPostMvp && (
        <WorkStartNote
          subscription={journey.subscription}
          clientPossessive={possessive.lower}
        />
      )}
    </div>
  );
}

function SubmittedOnboarding({ journey }: { journey: ClientJourney }) {
  const { startReview, approveAnswers, requestDetails } = useClientJourneys();
  const [openForms, setOpenForms] = useState<string[]>([]);
  const request = openRequest(journey);
  const [flagged, setFlagged] = useState<string[] | null>(null);
  const [confirmApproveOpen, setConfirmApproveOpen] = useState(false);

  const forms = reviewForms(journey.onboarding, journey.profile.identity.gender);

  const enterReview = () => {
    if (journey.stage === 'submitted') startReview(journey.callId);
    setFlagged([]);
  };

  const toggleFlag = (questionId: string) => {
    setFlagged((current) => {
      const flags = current ?? [];

      return flags.includes(questionId)
        ? flags.filter((id) => id !== questionId)
        : [...flags, questionId];
    });
  };

  const askForDetails = (note: string) => {
    requestDetails(journey.callId, {
      questionIds: flagged ?? [],
      message: note,
      createdAt: new Date(),
      raisedFrom: 'reviewing',
    });
    setFlagged(null);
    toast.success(`Email sent to ${journey.profile.identity.email}.`);
  };

  const confirmApprove = () => {
    if (journey.stage === 'submitted') startReview(journey.callId);
    approveAnswers(journey.callId);
    setConfirmApproveOpen(false);
    setFlagged(null);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3" data-parity="answers-section">
        <h3 className={WIDGET_SUBHEADING_CLASS}>Answers</h3>
        {request && <RequestStatus request={request} />}
        <AnswerGroups
          forms={forms}
          view={{
            openForms,
            onOpenForms: setOpenForms,
            review: null,
            asked: request ? new Set(request.questionIds) : undefined,
          }}
        />
      </div>

      <StageActions
        journey={journey}
        onReview={enterReview}
        onApprove={() => setConfirmApproveOpen(true)}
      />

      <OnboardingReviewDialog
        open={flagged !== null}
        onOpenChange={(open) => {
          if (!open) setFlagged(null);
        }}
        journey={journey}
        forms={forms}
        flagged={flagged ?? []}
        toggleFlag={toggleFlag}
        onApprove={
          journey.stage === 'reviewing'
            ? () => setConfirmApproveOpen(true)
            : undefined
        }
        onSend={askForDetails}
        onCancel={() => setFlagged(null)}
      />

      <ConfirmDialog
        open={confirmApproveOpen}
        onOpenChange={setConfirmApproveOpen}
        title={`Approve ${journey.profile.identity.firstName}'s answers?`}
        description="You won't be able to ask for more details once you approve."
        confirmLabel="Approve"
        onConfirm={confirmApprove}
      />
    </div>
  );
}

export function OnboardingPanel({ journey }: { journey: ClientJourney }) {
  const submitted = !isBeforeStage(journey.stage, 'submitted');
  const { possessive } = clientPronouns(journey.profile.identity.gender);
  const frame = {
    title: 'Onboarding',
    icon: ClipboardList,
    headingId: 'onboarding-panel-heading',
    titleAdornment: submitted && <ScreeningWarning journey={journey} />,
    action: <ClientStatusBadge status={clientStatus(journey, new Date())} />,
    parityRoot: 'OnboardingPanel',
    className: 'mb-8',
  };
  const body = submitted ? (
    <SubmittedOnboarding journey={journey} />
  ) : (
    <p className="text-sm text-text-secondary">
      {possessive.capitalised} answers are not in yet.
    </p>
  );

  if (!isBeforeStage(journey.stage, 'approved')) {
    return <CollapsiblePortalWidget {...frame}>{body}</CollapsiblePortalWidget>;
  }

  return (
    <PortalWidget presentation="coach" {...frame}>
      {body}
    </PortalWidget>
  );
}
