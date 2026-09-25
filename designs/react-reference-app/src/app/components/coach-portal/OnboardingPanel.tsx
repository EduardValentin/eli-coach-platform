import { useState } from 'react';
import { ClipboardList, MessageSquareText, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router';
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
import {
  canDeliverProgram,
  deliveryDate,
  type CoachingSubscription,
} from '../../domain/coachingSubscription';
import { formatRatio, waistToHeightRatio } from '../../domain/bodyMetrics';
import { CYCLE_MODE_LABELS, cycleModeOf } from '../../domain/cycleMode';
import {
  awaitsCoachReview,
  type ClientJourney,
  type DetailRequest,
  type JourneyStage,
} from '../../domain/journey';
import {
  CHECK_IN_CHANNEL_KEY,
  CHECK_IN_DAY_KEY,
  collaborationPreference,
  hasPregnancyContext,
  reviewForms,
  type ReviewAnswer,
  type ReviewForm,
} from '../../domain/onboardingAnswers';
import {
  PARQ_QUESTION_IDS,
  screeningOutcome,
  withholdsNutritionAdvice,
} from '../../domain/safetyScreening';
import { formatJourneyDate } from '../../utils/journeyLabels';
import { PortalWidget } from '../PortalWidget';
import { Reading } from '../Reading';
import { StatusHint } from '../StatusHint';
import { WIDGET_SUBHEADING_CLASS } from '../typography';
import { JourneyStageBadge } from './JourneyStageBadge';
import { OnboardingReviewDialog } from './OnboardingReviewDialog';
import { ReviewAnswerValue } from './ReviewAnswerValue';
import { useAppState } from '../../context/AppContext';

const RATIO_HIDDEN_NOTE = 'Not shown during pregnancy or right after birth.';
const BUILD_ACTION = 'Build her program';

const REVIEW_ACTIONS: Partial<Record<JourneyStage, string>> = {
  submitted: 'Review answers',
  reviewing: 'Continue review',
  approved: 'Review again',
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

function ratioValue(journey: ClientJourney, heightCm: number): string {
  if (hasPregnancyContext(journey.onboarding)) return RATIO_HIDDEN_NOTE;

  const latest = journey.measurements.at(-1);
  const ratio = latest ? waistToHeightRatio(latest.waistCm, heightCm) : null;

  return ratio === null
    ? 'Waiting on her first measurements'
    : formatRatio(ratio);
}

function screeningWarnings(journey: ClientJourney): string[] {
  const outcome = screeningOutcome(
    journey.onboarding,
    journey.identity,
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
    <StatusHint
      label={warnings.join('. ')}
      icon={<TriangleAlert aria-hidden="true" size={16} />}
      className="text-destructive"
    >
      {warnings.map((warning) => (
        <p key={warning}>{warning}</p>
      ))}
    </StatusHint>
  );
}

function cycleModeValue(journey: ClientJourney): string {
  if (journey.identity.sex === 'male') return 'Not applicable';

  const mode = cycleModeOf(journey.onboarding);
  return mode ? CYCLE_MODE_LABELS[mode] : 'Not answered yet';
}

function OnboardingFacts({
  journey,
  heightCm,
}: {
  journey: ClientJourney;
  heightCm: number;
}) {
  const day = collaborationPreference(journey.onboarding, CHECK_IN_DAY_KEY);
  const channel = collaborationPreference(
    journey.onboarding,
    CHECK_IN_CHANNEL_KEY,
  );

  return (
    <dl className="grid grid-cols-2 gap-5 lg:grid-cols-4">
      <Reading
        as="dl-item"
        label="Waist-to-height ratio"
        value={
          <span className="tabular-nums">{ratioValue(journey, heightCm)}</span>
        }
      />
      <Reading
        as="dl-item"
        label="Check-in day"
        value={day ?? 'Not chosen yet'}
      />
      <Reading
        as="dl-item"
        label="Channel"
        value={channel ?? 'Not chosen yet'}
      />
      <Reading
        as="dl-item"
        label="Cycle mode"
        value={cycleModeValue(journey)}
      />
    </dl>
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
        {asked && <Badge tone="pending">Asked again</Badge>}
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
    >
      {forms.map((form) => (
        <AccordionItem key={form.formId} value={form.formId}>
          <AccordionTrigger>
            <span className="flex flex-1 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="text-base font-medium">{form.title}</span>
              <span className="flex items-center gap-2 text-xs font-normal text-text-secondary">
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
    <div className="space-y-1 text-sm text-text-secondary">
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

function DeliveryNote({
  subscription,
}: {
  subscription: CoachingSubscription | undefined;
}) {
  const deliverOn =
    subscription && !canDeliverProgram(subscription, new Date())
      ? deliveryDate(subscription)
      : null;

  if (!deliverOn) return null;

  return (
    <p className="text-xs text-text-secondary">
      Her program will be delivered on {formatJourneyDate(deliverOn)}.
    </p>
  );
}

function StageActions({
  journey,
  clientId,
  onReview,
  onApprove,
}: {
  journey: ClientJourney;
  clientId: string;
  onReview: () => void;
  onApprove: () => void;
}) {
  const { appState } = useAppState();

  if (!awaitsCoachReview(journey.stage)) return null;

  const reviewAction = REVIEW_ACTIONS[journey.stage];
  const isPostMvp = appState.prototypeMode === 'post-mvp';
  const canApprove =
    journey.stage === 'submitted' || journey.stage === 'reviewing';

  if (!isPostMvp && !reviewAction) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-3 sm:flex-row">
        {reviewAction && (
          <Button variant="outline" onClick={onReview}>
            {reviewAction}
          </Button>
        )}
        {isPostMvp && (
          <Button variant="primary" asChild>
            <Link to={`/coach/training/builder/${clientId}`}>
              {BUILD_ACTION}
            </Link>
          </Button>
        )}
        {!isPostMvp && canApprove && (
          <Button variant="primary" onClick={onApprove}>
            Approve answers
          </Button>
        )}
      </div>
      {isPostMvp && <DeliveryNote subscription={journey.subscription} />}
    </div>
  );
}

export function OnboardingPanel({
  journey,
  clientId,
  heightCm,
}: {
  journey: ClientJourney;
  clientId: string;
  heightCm: number;
}) {
  const { startReview, approveAnswers, requestDetails } = useClientJourneys();
  const [openForms, setOpenForms] = useState<string[]>([]);
  const request = openRequest(journey);
  const [flagged, setFlagged] = useState<string[] | null>(null);
  const [confirmApproveOpen, setConfirmApproveOpen] = useState(false);

  const forms = reviewForms(journey.onboarding, journey.identity.sex);

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

  const approve = () => {
    approveAnswers(journey.callId);
    setFlagged(null);
  };

  const askForDetails = (note: string) => {
    requestDetails(journey.callId, {
      questionIds: flagged ?? [],
      message: note,
      createdAt: new Date(),
      raisedFrom: journey.stage === 'approved' ? 'approved' : 'reviewing',
    });
    setFlagged(null);
  };

  const confirmApprove = () => {
    if (journey.stage === 'submitted') startReview(journey.callId);
    approveAnswers(journey.callId);
    setConfirmApproveOpen(false);
  };

  return (
    <PortalWidget
      presentation="coach"
      title="Onboarding"
      icon={
        <ClipboardList
          aria-hidden="true"
          className="text-brand-secondary"
          size={18}
        />
      }
      headingId="onboarding-panel-heading"
      titleAdornment={<ScreeningWarning journey={journey} />}
      action={<JourneyStageBadge stage={journey.stage} />}
      className="mb-8"
    >
      <div className="space-y-6">
        <OnboardingFacts journey={journey} heightCm={heightCm} />

        <div className="space-y-3 border-t border-border-subtle pt-6">
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
          clientId={clientId}
          onReview={enterReview}
          onApprove={() => setConfirmApproveOpen(true)}
        />
      </div>

      <OnboardingReviewDialog
        open={flagged !== null}
        onOpenChange={(open) => {
          if (!open) setFlagged(null);
        }}
        journey={journey}
        forms={forms}
        flagged={flagged ?? []}
        toggleFlag={toggleFlag}
        onApprove={journey.stage === 'reviewing' ? approve : undefined}
        onSend={askForDetails}
        onCancel={() => setFlagged(null)}
      />

      <ConfirmDialog
        open={confirmApproveOpen}
        onOpenChange={setConfirmApproveOpen}
        title={`Approve ${journey.identity.firstName}'s answers?`}
        description="You can still ask for more details later from her onboarding."
        confirmLabel="Approve"
        onConfirm={confirmApprove}
      />
    </PortalWidget>
  );
}
