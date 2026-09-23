import { useState } from 'react';
import { motion } from 'motion/react';
import { ClipboardList } from 'lucide-react';
import { Link } from 'react-router';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion';
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
import {
  awaitsCoachReview,
  type ClientJourney,
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
import { formatJourneyDate } from '../../utils/journeyLabels';
import { JourneyStageBadge } from './JourneyStageBadge';
import { OnboardingReviewDialog } from './OnboardingReviewDialog';
import { ReviewAnswerValue } from './ReviewAnswerValue';
import { useAppState } from '../../context/AppContext';

const PANEL_CLASS =
  'bg-white p-6 rounded-panel shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50';

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
};

function SubHeading({ children }: { children: string }) {
  return (
    <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
      {children}
    </h3>
  );
}

function RatioReading({
  journey,
  heightCm,
}: {
  journey: ClientJourney;
  heightCm: number;
}) {
  if (hasPregnancyContext(journey.onboarding)) {
    return <p className="text-sm text-text-secondary">{RATIO_HIDDEN_NOTE}</p>;
  }

  const latest = journey.measurements.at(-1);
  const ratio = latest ? waistToHeightRatio(latest.waistCm, heightCm) : null;

  if (ratio === null) {
    return (
      <p className="text-sm text-text-secondary">
        Waiting on her first measurements.
      </p>
    );
  }

  return (
    <p className="font-serif text-2xl text-text-primary">{formatRatio(ratio)}</p>
  );
}

function CollaborationReading({ journey }: { journey: ClientJourney }) {
  const day = collaborationPreference(journey.onboarding, CHECK_IN_DAY_KEY);
  const channel = collaborationPreference(
    journey.onboarding,
    CHECK_IN_CHANNEL_KEY,
  );

  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      <div>
        <dt className="text-xs text-text-secondary">Check-in day</dt>
        <dd className="text-sm font-medium text-text-primary">
          {day ?? 'Not chosen yet'}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-text-secondary">Channel</dt>
        <dd className="text-sm font-medium text-text-primary">
          {channel ?? 'Not chosen yet'}
        </dd>
      </div>
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
}: {
  answer: ReviewAnswer;
  review: ReviewSession | null;
}) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:gap-6">
      <dt className="text-sm text-text-secondary">
        <AnswerQuestion answer={answer} review={review} />
      </dt>
      <dd className={cn('text-sm text-text-primary', review && 'pl-8 sm:pl-0')}>
        <ReviewAnswerValue answer={answer} />
      </dd>
    </div>
  );
}

export function AnswerGroups({
  forms,
  view,
}: {
  forms: ReviewForm[];
  view: AnswersView;
}) {
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
              <span className="font-serif text-base font-medium">
                {form.title}
              </span>
              <span className="text-xs font-normal text-text-secondary">
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
                />
              ))}
            </dl>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

function questionLabels(forms: ReviewForm[], questionIds: string[]): string[] {
  const asked = new Set(questionIds);

  return forms
    .flatMap((form) => form.answers)
    .filter((answer) => asked.has(answer.questionId))
    .map((answer) => answer.label);
}

function PendingRequest({
  journey,
  forms,
}: {
  journey: ClientJourney;
  forms: ReviewForm[];
}) {
  const request = journey.review.requests.at(-1);
  if (journey.stage !== 'needs-details' || !request || request.answeredAt) {
    return null;
  }

  return (
    <div className="space-y-3 rounded-card border border-border-subtle bg-surface-quiet/60 p-4">
      <SubHeading>What you asked her for</SubHeading>
      <p className="text-sm leading-relaxed text-text-primary">
        {request.message}
      </p>
      <ul className="flex flex-wrap gap-2">
        {questionLabels(forms, request.questionIds).map((label) => (
          <li
            key={label}
            className="rounded-tile bg-surface-base px-2 py-1 text-xs text-text-secondary"
          >
            {label}
          </li>
        ))}
      </ul>
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
        {isPostMvp && (
          <Button variant="default" asChild>
            <Link to={`/coach/training/builder/${clientId}`}>{BUILD_ACTION}</Link>
          </Button>
        )}
        {!isPostMvp && canApprove && (
          <Button variant="default" onClick={onApprove}>
            Approve answers
          </Button>
        )}
        {reviewAction && (
          <Button variant="outline" onClick={onReview}>
            {reviewAction}
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
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${PANEL_CLASS} mb-8 space-y-6`}
      aria-labelledby="onboarding-panel-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="onboarding-panel-heading"
          className="flex items-center gap-2 font-serif text-lg font-semibold text-text-primary"
        >
          <ClipboardList size={18} className="text-brand" aria-hidden="true" />
          Onboarding
        </h2>
        <JourneyStageBadge stage={journey.stage} />
      </div>

      <PendingRequest journey={journey} forms={forms} />

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <SubHeading>Waist-to-height ratio</SubHeading>
          <RatioReading journey={journey} heightCm={heightCm} />
        </div>
        <div className="space-y-2">
          <SubHeading>How she wants to work together</SubHeading>
          <CollaborationReading journey={journey} />
        </div>
      </div>

      <div className="space-y-3">
        <SubHeading>Her answers</SubHeading>
        <AnswerGroups
          forms={forms}
          view={{ openForms, onOpenForms: setOpenForms, review: null }}
        />
      </div>

      <StageActions
        journey={journey}
        clientId={clientId}
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
    </motion.section>
  );
}
