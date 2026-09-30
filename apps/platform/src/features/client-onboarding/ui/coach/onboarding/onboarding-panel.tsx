import type { VisitorGender } from "@eli-coach-platform/domain/assessment-call";
import { PortalWidget } from "@eli-coach-platform/ui/portal";
import { Button } from "@eli-coach-platform/ui/primitives";
import { ConfirmDialog } from "@eli-coach-platform/ui/overlays";
import { ClipboardList, MessageSquareText } from "lucide-react";
import { useState, type ReactNode } from "react";

import type { QuestionId } from "~/features/client-onboarding/contracts/onboarding";
import type {
  OnboardingReviewView,
  OpenDetailRequest,
  ReviewStage,
  SubmittedReview,
} from "~/features/client-onboarding/contracts/onboarding-review";
import {
  answersNotInLine,
  ANSWERS_HEADING,
  APPROVE_ACTION,
  APPROVE_CONFIRM,
  CYCLE_MODE_LABELS,
  CYCLE_MODE_NOT_ANSWERED,
  FACT_LABELS,
  NOT_CHOSEN_YET,
  PANEL_TITLE,
  RATIO_HIDDEN_NOTE,
  ratioWaitingLine,
  REVIEW_ACTIONS,
  waitingLine,
} from "~/features/client-onboarding/contracts/onboarding-review-copy";

import { AnswerGroups } from "./answer-groups";
import { waistToHeightRatio } from "./body-metrics";
import { OnboardingReviewDialog } from "./onboarding-review-dialog";
import { toggleQuestion } from "./question-ids";
import { formatDayMonth, useReviewDayTimeZone } from "./review-day-format";
import { ScreeningWarning } from "./screening-warning";
import { useOnboardingReviewActions } from "./use-onboarding-review-actions";

type ReviewedClient = {
  email: string;
  firstName: string;
  profile: { gender: VisitorGender };
};

type OnboardingPanelProps = {
  client: ReviewedClient;
  review: OnboardingReviewView;
  statusBadge: ReactNode;
};

type SubmittedOnboardingProps = {
  client: ReviewedClient;
  review: OnboardingReviewView;
  submitted: SubmittedReview;
};

type OnboardingFactsProps = {
  gender: VisitorGender;
  review: OnboardingReviewView;
  submitted: SubmittedReview;
};

type FactProps = {
  label: string;
  parity: string;
  value: ReactNode;
};

type StageActionsProps = {
  onApprove: () => void;
  onReview: () => void;
  stage: ReviewStage;
};

const NO_QUESTIONS: readonly QuestionId[] = [];

function ratioValue(
  review: OnboardingReviewView,
  submitted: SubmittedReview,
  gender: VisitorGender,
): string {
  if (submitted.pregnancyContext) {
    return RATIO_HIDDEN_NOTE;
  }

  const latest = review.measurements.at(-1);
  const ratio = latest
    ? waistToHeightRatio(latest.waistCm, review.statedHeightCm)
    : null;

  return ratio ?? ratioWaitingLine(gender);
}

function cycleModeValue(submitted: SubmittedReview): string {
  return submitted.cycleMode
    ? CYCLE_MODE_LABELS[submitted.cycleMode]
    : CYCLE_MODE_NOT_ANSWERED;
}

function Fact({ label, parity, value }: FactProps) {
  return (
    <div>
      <dt className="text-label text-text-secondary uppercase">{label}</dt>
      <dd
        className="mt-1 text-sm font-medium text-text-primary"
        data-parity={parity}
      >
        {value}
      </dd>
    </div>
  );
}

function OnboardingFacts({ gender, review, submitted }: OnboardingFactsProps) {
  return (
    <dl className="grid grid-cols-2 gap-5 lg:grid-cols-4">
      <Fact
        label={FACT_LABELS.ratio}
        parity="fact-ratio"
        value={
          <span className="tabular-nums">
            {ratioValue(review, submitted, gender)}
          </span>
        }
      />
      <Fact
        label={FACT_LABELS.checkInDay}
        parity="fact-checkin-day"
        value={submitted.checkInDay ?? NOT_CHOSEN_YET}
      />
      <Fact
        label={FACT_LABELS.channel}
        parity="fact-channel"
        value={submitted.checkInChannel ?? NOT_CHOSEN_YET}
      />
      <Fact
        label={FACT_LABELS.cycleMode}
        parity="fact-cycle-mode"
        value={cycleModeValue(submitted)}
      />
    </dl>
  );
}

function RequestStatus({ request }: { request: OpenDetailRequest }) {
  const timeZone = useReviewDayTimeZone();

  return (
    <div
      className="space-y-1 text-sm text-text-secondary"
      data-parity="request-status"
    >
      <p className="flex items-center gap-2">
        <MessageSquareText aria-hidden="true" size={16} />
        {waitingLine(
          request.questions.length,
          formatDayMonth(request.askedAt, timeZone),
        )}
      </p>
      <blockquote className="border-l-2 border-border-subtle pl-3 italic">
        {request.note}
      </blockquote>
    </div>
  );
}

function StageActions({ onApprove, onReview, stage }: StageActionsProps) {
  if (stage !== "awaiting-review" && stage !== "in-review") {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          data-parity="review-action"
          onClick={onReview}
          size="sm"
          variant="outline"
        >
          {REVIEW_ACTIONS[stage]}
        </Button>
        <Button
          data-parity="approve-action"
          onClick={onApprove}
          size="sm"
          variant="primary"
        >
          {APPROVE_ACTION}
        </Button>
      </div>
    </div>
  );
}

function SubmittedOnboarding({
  client,
  review,
  submitted,
}: SubmittedOnboardingProps) {
  const [openForms, setOpenForms] = useState<string[]>([]);
  const [flagged, setFlagged] = useState<QuestionId[] | null>(null);
  const [confirmingApproval, setConfirmingApproval] = useState(false);
  const request = submitted.openRequest;
  const actions = useOnboardingReviewActions(
    { clientId: review.clientId, email: client.email },
    {
      onApproved: () => {
        setConfirmingApproval(false);
        setFlagged(null);
      },
      onDetailsRequested: () => setFlagged(null),
    },
  );

  const enterReview = () => {
    if (submitted.stage === "awaiting-review") {
      actions.openReview();
    }
    setFlagged([]);
  };

  const toggleFlag = (question: QuestionId) => {
    setFlagged((current) => toggleQuestion(current ?? [], question));
  };

  const askForDetails = (note: string) => {
    actions.askForDetails({ note, questions: flagged ?? [] });
  };

  return (
    <div className="space-y-6">
      <OnboardingFacts
        gender={client.profile.gender}
        review={review}
        submitted={submitted}
      />

      <div className="space-y-3 border-t border-border-subtle pt-6">
        <h3 className="text-sm font-medium text-text-primary">
          {ANSWERS_HEADING}
        </h3>
        {request ? <RequestStatus request={request} /> : null}
        <AnswerGroups
          forms={submitted.forms}
          view={{
            asked: request?.questions ?? NO_QUESTIONS,
            onOpenForms: setOpenForms,
            openForms,
            review: null,
          }}
        />
      </div>

      <StageActions
        onApprove={() => setConfirmingApproval(true)}
        onReview={enterReview}
        stage={submitted.stage}
      />

      <OnboardingReviewDialog
        firstName={client.firstName}
        flagged={flagged}
        gender={client.profile.gender}
        forms={submitted.forms}
        onApprove={
          submitted.stage === "in-review"
            ? () => setConfirmingApproval(true)
            : null
        }
        onClose={() => setFlagged(null)}
        onSend={askForDetails}
        onToggleFlag={toggleFlag}
      />

      <ConfirmDialog
        confirmLabel={APPROVE_CONFIRM.confirm}
        description={APPROVE_CONFIRM.description}
        onConfirm={actions.approve}
        onOpenChange={setConfirmingApproval}
        open={confirmingApproval}
        title={APPROVE_CONFIRM.title(client.firstName)}
      />
    </div>
  );
}

export function OnboardingPanel({
  client,
  review,
  statusBadge,
}: OnboardingPanelProps) {
  const submitted = review.submitted;

  return (
    <PortalWidget
      action={statusBadge}
      className="mb-8"
      data-parity-root="OnboardingPanel"
      headingId="onboarding-panel-heading"
      icon={
        <ClipboardList
          aria-hidden="true"
          className="text-brand-secondary"
          size={18}
        />
      }
      title={PANEL_TITLE}
      titleAdornment={
        submitted ? <ScreeningWarning submitted={submitted} /> : null
      }
    >
      {submitted ? (
        <SubmittedOnboarding
          client={client}
          review={review}
          submitted={submitted}
        />
      ) : (
        <p className="text-sm text-text-secondary">
          {answersNotInLine(client.profile.gender)}
        </p>
      )}
    </PortalWidget>
  );
}
